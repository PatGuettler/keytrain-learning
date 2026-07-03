-- Per-user RailNet table column layout (host uploads, security posture).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS railnet_table_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN profiles.railnet_table_prefs IS
  'RailNet table UI: column order, visibility, and widths keyed by view id.';
