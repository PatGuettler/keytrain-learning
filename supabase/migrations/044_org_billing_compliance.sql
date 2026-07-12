-- Additive: LMS/plan license fields, billing terms, compliance RLS for org leaders.
-- Requires 043_add_org_admin_role.sql (org_admin enum value) to be applied first.
-- Does not drop or wipe existing data.

-- 1) Org license: LMS flag + plan SKU (defaults preserve current access)
ALTER TABLE org_license
  ADD COLUMN IF NOT EXISTS lms_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE org_license
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'both';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'org_license_plan_check'
  ) THEN
    ALTER TABLE org_license
      ADD CONSTRAINT org_license_plan_check
      CHECK (plan IN ('lms', 'railnet', 'both'));
  END IF;
END $$;

COMMENT ON COLUMN org_license.plan IS
  'Catalog plan: lms | railnet (KeyTrain Pro) | both. Drives entitlement defaults; locked bill terms live in org_billing_terms.';

COMMENT ON COLUMN org_license.lms_enabled IS
  'When true, org members can use LMS training features.';

-- Existing hospital orgs already have railnet+compliance true from 036 — treat as both
UPDATE org_license
SET
  lms_enabled = COALESCE(lms_enabled, true),
  plan = CASE
    WHEN railnet_enabled AND compliance_enabled THEN 'both'
    WHEN railnet_enabled THEN 'railnet'
    ELSE 'lms'
  END;

-- Org members can read their own license (for feature gates)
DROP POLICY IF EXISTS org_license_member_select ON org_license;
CREATE POLICY org_license_member_select ON org_license
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR org_id = auth_org_id()
  );

DROP POLICY IF EXISTS org_license_org_admin_write ON org_license;
CREATE POLICY org_license_org_admin_write ON org_license
  FOR UPDATE
  USING (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'org_admin' AND org_id = auth_org_id())
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'org_admin' AND org_id = auth_org_id())
  );

-- 2) Locked billing terms per org (grandfathered at signup / first assign)
CREATE TABLE IF NOT EXISTS org_billing_terms (
  org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('lms', 'railnet', 'both')),
  plan_base_cents INTEGER NOT NULL CHECK (plan_base_cents >= 0),
  org_admin_cents INTEGER NOT NULL CHECK (org_admin_cents >= 0),
  manager_cents INTEGER NOT NULL CHECK (manager_cents >= 0),
  employee_cents INTEGER NOT NULL CHECK (employee_cents >= 0),
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE org_billing_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_billing_terms_select ON org_billing_terms;
CREATE POLICY org_billing_terms_select ON org_billing_terms
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      org_id = auth_org_id()
      AND auth_user_role() IN ('org_admin', 'manager', 'employee')
    )
  );

DROP POLICY IF EXISTS org_billing_terms_admin_write ON org_billing_terms;
CREATE POLICY org_billing_terms_admin_write ON org_billing_terms
  FOR ALL
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

-- Backfill locked terms from current catalog for existing orgs (do not overwrite if already present)
INSERT INTO org_billing_terms (
  org_id, plan, plan_base_cents, org_admin_cents, manager_cents, employee_cents
)
SELECT
  o.id,
  COALESCE(l.plan, 'both'),
  CASE COALESCE(l.plan, 'both')
    WHEN 'lms' THEN 1199
    WHEN 'railnet' THEN 2999
    ELSE 3599
  END,
  1099,
  899,
  599
FROM organizations o
LEFT JOIN org_license l ON l.org_id = o.id
WHERE o.id <> '00000000-0000-0000-0000-000000000099'
ON CONFLICT (org_id) DO NOTHING;

-- Ensure org_license row exists for hospital orgs
INSERT INTO org_license (org_id, railnet_enabled, compliance_enabled, lms_enabled, plan)
SELECT id, true, true, true, 'both'
FROM organizations
WHERE id <> '00000000-0000-0000-0000-000000000099'
ON CONFLICT (org_id) DO NOTHING;

-- 3) Compliance: org-scoped access for org_admin + railnet_enabled managers/employees
CREATE OR REPLACE FUNCTION auth_org_railnet_org_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(trim(o.railnet_org_id), '')
  FROM organizations o
  WHERE o.id = auth_org_id();
$$;

CREATE OR REPLACE FUNCTION auth_can_access_compliance()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND EXISTS (
        SELECT 1 FROM org_license l
        WHERE l.org_id = auth_org_id()
          AND l.railnet_enabled = true
          AND l.compliance_enabled = true
      )
    )
    OR (
      auth_user_role() IN ('manager', 'employee')
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.railnet_enabled = true
      )
      AND EXISTS (
        SELECT 1 FROM org_license l
        WHERE l.org_id = auth_org_id()
          AND l.railnet_enabled = true
          AND l.compliance_enabled = true
      )
    );
$$;

DROP POLICY IF EXISTS compliance_document_templates_org_read ON compliance_document_templates;
CREATE POLICY compliance_document_templates_org_read ON compliance_document_templates
  FOR SELECT
  USING (auth_can_access_compliance());

DROP POLICY IF EXISTS compliance_documents_org_select ON compliance_documents;
CREATE POLICY compliance_documents_org_select ON compliance_documents
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_can_access_compliance()
      AND (
        railnet_org_id IS NULL
        OR railnet_org_id = auth_org_railnet_org_id()
      )
    )
  );

DROP POLICY IF EXISTS compliance_documents_org_write ON compliance_documents;
CREATE POLICY compliance_documents_org_write ON compliance_documents
  FOR INSERT
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_can_access_compliance()
      AND (
        railnet_org_id IS NULL
        OR railnet_org_id = auth_org_railnet_org_id()
      )
    )
  );

DROP POLICY IF EXISTS compliance_documents_org_update ON compliance_documents;
CREATE POLICY compliance_documents_org_update ON compliance_documents
  FOR UPDATE
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_can_access_compliance()
      AND (
        railnet_org_id IS NULL
        OR railnet_org_id = auth_org_railnet_org_id()
      )
    )
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_can_access_compliance()
      AND (
        railnet_org_id IS NULL
        OR railnet_org_id = auth_org_railnet_org_id()
      )
    )
  );

DROP POLICY IF EXISTS compliance_document_versions_org_select ON compliance_document_versions;
CREATE POLICY compliance_document_versions_org_select ON compliance_document_versions
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM compliance_documents d
      WHERE d.id = document_id
        AND (
          auth_can_access_compliance()
          AND (
            d.railnet_org_id IS NULL
            OR d.railnet_org_id = auth_org_railnet_org_id()
          )
        )
    )
  );

DROP POLICY IF EXISTS compliance_document_versions_org_insert ON compliance_document_versions;
CREATE POLICY compliance_document_versions_org_insert ON compliance_document_versions
  FOR INSERT
  WITH CHECK (
    auth_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM compliance_documents d
      WHERE d.id = document_id
        AND auth_can_access_compliance()
        AND (
          d.railnet_org_id IS NULL
          OR d.railnet_org_id = auth_org_railnet_org_id()
        )
    )
  );
