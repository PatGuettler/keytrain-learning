-- Per-organization RailNet / compliance feature flags (admin-managed).

CREATE TABLE org_license (
  org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  railnet_enabled BOOLEAN NOT NULL DEFAULT false,
  compliance_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX org_license_railnet_enabled_idx ON org_license (railnet_enabled)
  WHERE railnet_enabled = true;

ALTER TABLE org_license ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_license_admin_select ON org_license
  FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY org_license_admin_write ON org_license
  FOR ALL
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

-- Enable RailNet for existing hospital orgs (platform org excluded).
INSERT INTO org_license (org_id, railnet_enabled, compliance_enabled)
SELECT id, true, true
FROM organizations
WHERE id <> '00000000-0000-0000-0000-000000000099'
ON CONFLICT (org_id) DO NOTHING;
