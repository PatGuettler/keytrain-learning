-- Clear login lockout whenever a user successfully changes their password (recovery, invite, etc.).

CREATE OR REPLACE FUNCTION clear_profile_lockout_on_password_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
    UPDATE profiles
    SET failed_login_attempts = 0, login_locked_at = NULL
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_password_change ON auth.users;
CREATE TRIGGER on_auth_user_password_change
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION clear_profile_lockout_on_password_change();
