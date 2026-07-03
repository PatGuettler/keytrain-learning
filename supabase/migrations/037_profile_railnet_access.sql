-- Per-user RailNet access (granted by admins on the user profile).
-- AWS org mapping on organizations.hive_org_id (set in organization settings).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS railnet_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS hive_org_id TEXT;

CREATE INDEX profiles_railnet_enabled_idx ON profiles (railnet_enabled)
  WHERE railnet_enabled = true;
