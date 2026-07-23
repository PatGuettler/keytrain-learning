-- KTL admins can dismiss org training needs (module-level gaps) from the org dashboard.

CREATE TABLE resolved_training_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  resolved_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, module_id)
);

CREATE INDEX resolved_training_needs_org_idx ON resolved_training_needs (org_id);

ALTER TABLE resolved_training_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY resolved_training_needs_admin_all ON resolved_training_needs
  FOR ALL
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

COMMENT ON TABLE resolved_training_needs IS
  'Module training gaps dismissed by KTL admins on the org dashboard.';
