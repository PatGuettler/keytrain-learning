-- Security hardening: prevent privilege escalation, lockout abuse, and training bypass.

-- ---------------------------------------------------------------------------
-- 1. Profile updates — block self/manager changes to privileged columns
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION guard_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Service role / auth schema triggers (no JWT)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_role := auth_user_role();

  IF v_role = 'admin' THEN
    RETURN NEW;
  END IF;

  IF v_role = 'manager' AND OLD.manager_id = auth.uid() AND NEW.id IS DISTINCT FROM auth.uid() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.org_id IS DISTINCT FROM OLD.org_id
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.failed_login_attempts IS DISTINCT FROM OLD.failed_login_attempts
       OR NEW.login_locked_at IS DISTINCT FROM OLD.login_locked_at
       OR NEW.password_upgrade_required IS DISTINCT FROM OLD.password_upgrade_required
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.manager_id IS DISTINCT FROM OLD.manager_id
    THEN
      RAISE EXCEPTION 'Not allowed to modify privileged profile fields.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.id = auth.uid() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.org_id IS DISTINCT FROM OLD.org_id
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.failed_login_attempts IS DISTINCT FROM OLD.failed_login_attempts
       OR NEW.login_locked_at IS DISTINCT FROM OLD.login_locked_at
       OR NEW.password_upgrade_required IS DISTINCT FROM OLD.password_upgrade_required
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.manager_id IS DISTINCT FROM OLD.manager_id
    THEN
      RAISE EXCEPTION 'Not allowed to modify privileged profile fields.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_sensitive_columns ON profiles;
CREATE TRIGGER guard_profile_sensitive_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION guard_profile_sensitive_columns();

-- ---------------------------------------------------------------------------
-- 2. Lockout RPCs — restrict who can clear / unlock accounts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION clear_failed_login(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id AND auth_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Not allowed to clear lockout for this account.';
  END IF;

  UPDATE profiles
  SET failed_login_attempts = 0, login_locked_at = NULL
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION unlock_user_login(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_target FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found.';
  END IF;

  IF auth_user_role() = 'admin' THEN
    NULL;
  ELSIF auth_user_role() = 'manager' THEN
    IF v_target.manager_id IS DISTINCT FROM auth.uid()
       OR v_target.org_id IS DISTINCT FROM auth_org_id() THEN
      RAISE EXCEPTION 'Not allowed to unlock this account.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not allowed to unlock this account.';
  END IF;

  UPDATE profiles
  SET failed_login_attempts = 0, login_locked_at = NULL
  WHERE id = p_user_id;
END;
$$;

-- Only service role (edge function) may record failed logins — prevents anon lockout DoS.
REVOKE EXECUTE ON FUNCTION record_failed_login(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION record_failed_login(text) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Rate limiting buckets (service role only; no client policies)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  bucket text PRIMARY KEY,
  hit_count int NOT NULL DEFAULT 0,
  window_expires_at timestamptz NOT NULL
);

ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION hit_rate_limit(
  p_bucket text,
  p_max_hits int,
  p_window_seconds int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_row auth_rate_limits%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM auth_rate_limits WHERE bucket = p_bucket FOR UPDATE;

  IF NOT FOUND OR v_row.window_expires_at <= v_now THEN
    INSERT INTO auth_rate_limits (bucket, hit_count, window_expires_at)
    VALUES (p_bucket, 1, v_now + make_interval(secs => p_window_seconds))
    ON CONFLICT (bucket) DO UPDATE
      SET hit_count = 1, window_expires_at = v_now + make_interval(secs => p_window_seconds);
    RETURN true;
  END IF;

  IF v_row.hit_count >= p_max_hits THEN
    RETURN false;
  END IF;

  UPDATE auth_rate_limits
  SET hit_count = hit_count + 1
  WHERE bucket = p_bucket;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION hit_rate_limit(text, int, int) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Training — read max_attempts from DB; block direct assignment tampering
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_course_attempt_result(
  p_assignment_id UUID,
  p_passed BOOLEAN,
  p_max_attempts INT,
  p_score NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_attempts_used INT;
  v_locked_at TIMESTAMPTZ;
  v_new_attempts INT;
  v_locked BOOLEAN;
  v_unlimited BOOLEAN;
  v_max_attempts INT;
BEGIN
  SELECT a.user_id, a.attempts_used, a.locked_at, c.max_attempts
  INTO v_user_id, v_attempts_used, v_locked_at, v_max_attempts
  FROM assignments a
  JOIN courses c ON c.id = a.course_id
  WHERE a.id = p_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found.';
  END IF;

  v_unlimited := v_max_attempts = 0;

  IF v_user_id IS DISTINCT FROM auth.uid() AND auth_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Not allowed to update this assignment.';
  END IF;

  IF v_locked_at IS NOT NULL AND NOT v_unlimited THEN
    RAISE EXCEPTION 'Course is locked.';
  END IF;

  v_new_attempts := v_attempts_used + 1;

  IF p_passed THEN
    UPDATE assignments
    SET
      status = 'completed',
      locked_at = NULL,
      last_score = p_score,
      completed_at = now(),
      attempts_used = v_new_attempts
    WHERE id = p_assignment_id;

    RETURN jsonb_build_object(
      'passed', true,
      'attemptsUsed', v_new_attempts,
      'maxAttempts', v_max_attempts,
      'locked', false,
      'attemptsRemaining', CASE WHEN v_unlimited THEN -1 ELSE GREATEST(0, v_max_attempts - v_new_attempts) END,
      'score', p_score
    );
  END IF;

  v_locked := NOT v_unlimited AND v_new_attempts >= v_max_attempts;

  UPDATE assignments
  SET
    attempts_used = v_new_attempts,
    status = 'in_progress',
    locked_at = CASE WHEN v_locked THEN now() ELSE NULL END,
    last_score = COALESCE(p_score, last_score)
  WHERE id = p_assignment_id;

  RETURN jsonb_build_object(
    'passed', false,
    'attemptsUsed', v_new_attempts,
    'maxAttempts', v_max_attempts,
    'locked', v_locked,
    'attemptsRemaining', CASE WHEN v_unlimited THEN -1 ELSE GREATEST(0, v_max_attempts - v_new_attempts) END,
    'score', p_score
  );
END;
$$;

CREATE OR REPLACE FUNCTION guard_assignment_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF auth_user_role() IN ('admin', 'manager') THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Assignment progress must be recorded through training completion.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_assignment_user_update ON assignments;
CREATE TRIGGER guard_assignment_user_update
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION guard_assignment_user_update();

DROP POLICY IF EXISTS assignments_update_own ON assignments;

-- ---------------------------------------------------------------------------
-- 5. Managers may only delete assignments in their org
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS assignments_delete_manager ON assignments;
CREATE POLICY assignments_delete_manager ON assignments FOR DELETE
  USING (
    auth_user_role() IN ('admin', 'manager')
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = assignments.user_id
        AND p.org_id = auth_org_id()
    )
    AND (
      auth_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = assignments.user_id AND p.manager_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Unlock requests — user must own the assignment
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS unlock_requests_user_insert ON course_unlock_requests;
CREATE POLICY unlock_requests_user_insert ON course_unlock_requests FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_id
        AND a.user_id = auth.uid()
        AND a.course_id = course_id
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Password upgrade flags — dedicated RPCs (not direct profile column edits)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION flag_password_upgrade_required()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  UPDATE profiles
  SET password_upgrade_required = true
  WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION complete_password_upgrade()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  UPDATE profiles
  SET password_upgrade_required = false
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION flag_password_upgrade_required() TO authenticated;
GRANT EXECUTE ON FUNCTION complete_password_upgrade() TO authenticated;
