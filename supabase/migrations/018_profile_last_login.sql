-- Track last login on profiles (synced from auth.users.last_sign_in_at).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION sync_profile_last_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_sign_in_at IS NOT NULL
     AND NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE profiles
    SET last_login_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_last_login();

UPDATE profiles p
SET last_login_at = u.last_sign_in_at
FROM auth.users u
WHERE p.id = u.id
  AND u.last_sign_in_at IS NOT NULL
  AND p.last_login_at IS DISTINCT FROM u.last_sign_in_at;
