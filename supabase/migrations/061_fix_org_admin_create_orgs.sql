-- Fix org-admin multi-org creation: honor active profile org, inherit entitlement on new orgs,
-- and expose a SECURITY DEFINER check for the UI.

CREATE OR REPLACE FUNCTION org_admin_can_create_organizations()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM org_license l
    WHERE l.can_create_orgs = true
      AND (
        auth_is_org_admin_of(l.org_id)
        OR (
          l.org_id = (SELECT p.org_id FROM profiles p WHERE p.id = auth.uid())
          AND EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'org_admin'
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION org_admin_can_create_organizations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION org_admin_can_create_organizations() TO authenticated;

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
  v_inherit_create BOOLEAN := false;
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

  IF v_caller_role = 'admin' THEN
    RAISE EXCEPTION 'Platform admins should create organizations from the admin console.';
  END IF;

  SELECT org_admin_can_create_organizations() INTO v_can_create;

  IF NOT v_can_create THEN
    RAISE EXCEPTION 'Creating additional organizations is not enabled for your account. Contact KeyTrain to add this feature.';
  END IF;

  SELECT COALESCE(bool_or(l.can_create_orgs), false)
  INTO v_inherit_create
  FROM org_license l
  WHERE l.can_create_orgs = true
    AND (
      auth_is_org_admin_of(l.org_id)
      OR (
        l.org_id = (SELECT p.org_id FROM profiles p WHERE p.id = auth.uid())
        AND v_caller_role = 'org_admin'
      )
    );

  LOOP
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM organizations WHERE join_code = v_code);
  END LOOP;

  INSERT INTO organizations (name, join_code)
  VALUES (v_name, v_code)
  RETURNING * INTO v_org;

  INSERT INTO org_license (org_id, railnet_enabled, compliance_enabled, lms_enabled, can_create_orgs, plan)
  VALUES (v_org.id, false, false, true, v_inherit_create, 'lms')
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

-- Restore multi-org for existing org admins (057 grandfather may have been missed or toggled off).
UPDATE org_license l
SET can_create_orgs = true
WHERE l.can_create_orgs = false
  AND (
    EXISTS (
      SELECT 1
      FROM organization_memberships m
      WHERE m.org_id = l.org_id
        AND m.role = 'org_admin'
    )
    OR EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.org_id = l.org_id
        AND p.role = 'org_admin'
    )
  );

-- Backfill memberships for org admins who only exist on profiles (switcher/create checks).
INSERT INTO organization_memberships (user_id, org_id, role, is_active)
SELECT p.id, p.org_id, p.role, COALESCE(p.is_active, true)
FROM profiles p
WHERE p.role = 'org_admin'
  AND p.org_id IS NOT NULL
  AND p.org_id <> '00000000-0000-0000-0000-000000000099'
ON CONFLICT (user_id, org_id) DO UPDATE SET
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();
