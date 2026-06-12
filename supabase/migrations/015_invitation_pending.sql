-- Track users who were emailed an invite but have not finished registration yet.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS invitation_pending boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.invitation_pending IS
  'True after invite email is sent; cleared when the user sets their password.';

-- Existing invitees who have never signed in.
UPDATE profiles p
SET invitation_pending = true
FROM auth.users u
WHERE p.id = u.id
  AND u.invited_at IS NOT NULL
  AND u.last_sign_in_at IS NULL;
