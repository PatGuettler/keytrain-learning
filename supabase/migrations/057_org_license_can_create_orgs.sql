-- Paid add-on: org admins may create additional organizations only when at least
-- one org they administer has can_create_orgs on org_license (KTL admin toggle).

ALTER TABLE org_license
  ADD COLUMN IF NOT EXISTS can_create_orgs BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN org_license.can_create_orgs IS
  'When true, org admins of this organization may create additional organizations (paid add-on).';

-- Grandfather existing customers who already use multi-org.
UPDATE org_license SET can_create_orgs = true WHERE can_create_orgs = false;

CREATE OR REPLACE FUNCTION create_organization_as_org_admin(p_name TEXT)
RETURNS organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := trim(p_name);
  v_org organizations%ROWTYPE;
  v_code TEXT;
  v_caller_role user_role;
  v_is_org_admin BOOLEAN;
  v_can_create BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_name IS NULL OR length(v_name) < 2 THEN
    RAISE EXCEPTION 'Organization name is required';
  END IF;

  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  SELECT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = auth.uid() AND role = 'org_admin' AND is_active = true
  ) INTO v_is_org_admin;

  IF v_caller_role IS DISTINCT FROM 'org_admin'
     AND NOT v_is_org_admin
     AND v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only organization admins can create organizations';
  END IF;

  -- Platform admins use the admin org-creation flow, not this RPC.
  IF v_caller_role = 'admin' THEN
    RAISE EXCEPTION 'Platform admins should create organizations from the admin console.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM organization_memberships m
    JOIN org_license l ON l.org_id = m.org_id
    WHERE m.user_id = auth.uid()
      AND m.role = 'org_admin'
      AND m.is_active = true
      AND l.can_create_orgs = true
  ) INTO v_can_create;

  IF NOT v_can_create THEN
    RAISE EXCEPTION 'Creating additional organizations is not enabled for your account. Contact KeyTrain to add this feature.';
  END IF;

  LOOP
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM organizations WHERE join_code = v_code);
  END LOOP;

  INSERT INTO organizations (name, join_code)
  VALUES (v_name, v_code)
  RETURNING * INTO v_org;

  INSERT INTO org_license (org_id, railnet_enabled, compliance_enabled, lms_enabled, can_create_orgs, plan)
  VALUES (v_org.id, false, false, true, false, 'lms')
  ON CONFLICT (org_id) DO NOTHING;

  INSERT INTO org_billing_terms (
    org_id, plan, plan_base_cents, org_admin_cents, manager_cents, employee_cents, locked_at
  )
  VALUES (v_org.id, 'lms', 6000, 0, 0, 220, now())
  ON CONFLICT (org_id) DO NOTHING;

  INSERT INTO organization_memberships (user_id, org_id, role, is_active)
  VALUES (auth.uid(), v_org.id, 'org_admin', true)
  ON CONFLICT (user_id, org_id) DO UPDATE SET
    role = 'org_admin',
    is_active = true,
    updated_at = now();

  UPDATE profiles
  SET
    org_id = v_org.id,
    role = 'org_admin',
    updated_at = now()
  WHERE id = auth.uid();

  RETURN v_org;
END;
$$;

REVOKE ALL ON FUNCTION create_organization_as_org_admin(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_organization_as_org_admin(TEXT) TO authenticated;
