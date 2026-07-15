-- Fix: learners cannot complete courses because guard_assignment_user_update
-- blocks UPDATEs from record_course_attempt_result (SECURITY DEFINER still has
-- the learner JWT, so OLD.user_id = auth.uid() raises).

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

  -- Allowed when record_course_attempt_result (or similar) sets this local GUC
  IF current_setting('app.assignment_progress_ok', true) = '1' THEN
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

CREATE OR REPLACE FUNCTION record_course_attempt_result(
  p_assignment_id UUID,
  p_passed BOOLEAN,
  p_max_attempts INT DEFAULT NULL,
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
  v_course_id UUID;
  v_max_attempts INT;
  v_unlimited BOOLEAN;
  v_new_attempts INT;
  v_locked BOOLEAN;
BEGIN
  SELECT a.user_id, a.attempts_used, a.locked_at, a.course_id
  INTO v_user_id, v_attempts_used, v_locked_at, v_course_id
  FROM assignments a
  WHERE a.id = p_assignment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found.';
  END IF;

  SELECT COALESCE(p_max_attempts, c.max_attempts, 3)
  INTO v_max_attempts
  FROM courses c
  WHERE c.id = v_course_id;

  IF v_max_attempts IS NULL THEN
    v_max_attempts := 3;
  END IF;

  v_unlimited := v_max_attempts = 0;

  IF v_user_id IS DISTINCT FROM auth.uid() AND auth_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Not allowed to update this assignment.';
  END IF;

  IF v_locked_at IS NOT NULL AND NOT v_unlimited THEN
    RAISE EXCEPTION 'Course is locked.';
  END IF;

  v_new_attempts := v_attempts_used + 1;

  PERFORM set_config('app.assignment_progress_ok', '1', true);

  IF p_passed THEN
    UPDATE assignments
    SET
      status = 'completed',
      locked_at = NULL,
      force_retake = false,
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

GRANT EXECUTE ON FUNCTION record_course_attempt_result(UUID, BOOLEAN, INT, NUMERIC) TO authenticated;

-- Backfill LMS license + Standard billing for orgs created by KTL admin insert-only path
INSERT INTO org_license (org_id, railnet_enabled, compliance_enabled, lms_enabled, phishing_enabled, plan)
SELECT
  o.id,
  false,
  false,
  true,
  false,
  'lms'
FROM organizations o
WHERE o.id <> '00000000-0000-0000-0000-000000000099'
  AND NOT EXISTS (SELECT 1 FROM org_license l WHERE l.org_id = o.id)
ON CONFLICT (org_id) DO NOTHING;

INSERT INTO org_billing_terms (
  org_id, plan, plan_base_cents, org_admin_cents, manager_cents, employee_cents, locked_at
)
SELECT
  o.id,
  'lms',
  6000,
  0,
  0,
  220,
  now()
FROM organizations o
WHERE o.id <> '00000000-0000-0000-0000-000000000099'
  AND NOT EXISTS (SELECT 1 FROM org_billing_terms t WHERE t.org_id = o.id)
ON CONFLICT (org_id) DO NOTHING;

-- Ensure join_code exists for hospital orgs (needed for invite/join UX)
UPDATE organizations o
SET join_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE o.id <> '00000000-0000-0000-0000-000000000099'
  AND (o.join_code IS NULL OR length(trim(o.join_code)) = 0);
