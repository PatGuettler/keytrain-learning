-- Flag users who signed in with a legacy password shorter than the current policy.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS password_upgrade_required boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.password_upgrade_required IS
  'True when the user must set a longer password before using the app (legacy short password).';
