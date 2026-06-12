-- Account lockout after repeated failed login attempts.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0
    CHECK (failed_login_attempts >= 0),
  ADD COLUMN IF NOT EXISTS login_locked_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.failed_login_attempts IS
  'Consecutive failed sign-in attempts; reset on successful login or admin/manager unlock.';
COMMENT ON COLUMN profiles.login_locked_at IS
  'Set when failed_login_attempts reaches 3; cleared by manager/admin unlock or successful login.';

CREATE OR REPLACE FUNCTION check_login_status(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;

  IF NOT FOUND OR NOT v_profile.is_active THEN
    RETURN jsonb_build_object('locked', false);
  END IF;

  RETURN jsonb_build_object(
    'locked', v_profile.login_locked_at IS NOT NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION record_failed_login(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_attempts INT;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;

  IF NOT FOUND OR NOT v_profile.is_active OR v_profile.login_locked_at IS NOT NULL THEN
    RETURN;
  END IF;

  v_attempts := v_profile.failed_login_attempts + 1;

  UPDATE profiles
  SET
    failed_login_attempts = v_attempts,
    login_locked_at = CASE WHEN v_attempts >= 3 THEN now() ELSE login_locked_at END
  WHERE id = v_profile.id;
END;
$$;

CREATE OR REPLACE FUNCTION clear_failed_login(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
       AND NOT EXISTS (
         SELECT 1 FROM profiles p
         WHERE p.id = p_user_id AND p.org_id = auth_org_id()
       ) THEN
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

GRANT EXECUTE ON FUNCTION check_login_status(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_failed_login(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION clear_failed_login(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION unlock_user_login(uuid) TO authenticated;
