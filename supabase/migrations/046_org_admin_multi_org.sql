-- Multi-org membership for org admins (additive only — no deletes of existing data).
-- Keeps profiles.org_id as the "active" org so existing auth_org_id() RLS continues to work
-- after switch_active_organization().

-- 1) Membership table
CREATE TABLE IF NOT EXISTS organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id),
  CONSTRAINT organization_memberships_role_check
    CHECK (role IN ('org_admin', 'manager', 'employee'))
);

CREATE INDEX IF NOT EXISTS organization_memberships_user_idx
  ON organization_memberships (user_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS organization_memberships_org_idx
  ON organization_memberships (org_id)
  WHERE is_active = true;

COMMENT ON TABLE organization_memberships IS
  'Users may belong to multiple orgs. profiles.org_id is the currently active org for RLS.';

ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;

-- Platform admins: full access
DROP POLICY IF EXISTS organization_memberships_admin ON organization_memberships;
CREATE POLICY organization_memberships_admin ON organization_memberships
  FOR ALL
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

-- Users can read their own memberships
DROP POLICY IF EXISTS organization_memberships_select_own ON organization_memberships;
CREATE POLICY organization_memberships_select_own ON organization_memberships
  FOR SELECT
  USING (user_id = auth.uid());

-- Org admins can read memberships in orgs they administer (billing / user counts)
DROP POLICY IF EXISTS organization_memberships_org_admin_select ON organization_memberships;
CREATE POLICY organization_memberships_org_admin_select ON organization_memberships
  FOR SELECT
  USING (auth_is_org_admin_of(org_id));

-- 2) Backfill from existing profiles (idempotent; does not remove rows)
INSERT INTO organization_memberships (user_id, org_id, role, is_active)
SELECT
  p.id,
  p.org_id,
  p.role,
  COALESCE(p.is_active, true)
FROM profiles p
WHERE p.role IN ('org_admin', 'manager', 'employee')
  AND p.org_id <> '00000000-0000-0000-0000-000000000099'
ON CONFLICT (user_id, org_id) DO UPDATE SET
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- 3) Keep memberships in sync when profiles change (upsert only — never delete)
CREATE OR REPLACE FUNCTION sync_organization_membership_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IN ('org_admin', 'manager', 'employee')
     AND NEW.org_id IS NOT NULL
     AND NEW.org_id <> '00000000-0000-0000-0000-000000000099' THEN
    INSERT INTO organization_memberships (user_id, org_id, role, is_active)
    VALUES (NEW.id, NEW.org_id, NEW.role, COALESCE(NEW.is_active, true))
    ON CONFLICT (user_id, org_id) DO UPDATE SET
      role = EXCLUDED.role,
      is_active = EXCLUDED.is_active,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_organization_membership ON profiles;
CREATE TRIGGER trg_sync_organization_membership
  AFTER INSERT OR UPDATE OF org_id, role, is_active
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_organization_membership_from_profile();

-- 4) Helpers
CREATE OR REPLACE FUNCTION auth_member_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.org_id
  FROM organization_memberships m
  WHERE m.user_id = auth.uid()
    AND m.is_active = true;
$$;

CREATE OR REPLACE FUNCTION auth_is_org_admin_of(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_memberships m
    WHERE m.user_id = auth.uid()
      AND m.org_id = p_org_id
      AND m.role = 'org_admin'
      AND m.is_active = true
  );
$$;

-- 5) Expand SELECT so org admins can see every org they manage (for switcher + billing)
DROP POLICY IF EXISTS org_select ON organizations;
CREATE POLICY org_select ON organizations FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR id = auth_org_id()
    OR id IN (SELECT auth_member_org_ids())
  );

-- Org admins can rename orgs they administer (additive UPDATE policy)
DROP POLICY IF EXISTS organizations_org_admin_update ON organizations;
CREATE POLICY organizations_org_admin_update ON organizations FOR UPDATE
  USING (auth_is_org_admin_of(id))
  WITH CHECK (auth_is_org_admin_of(id));

-- Profiles: org admins can read staff in any org they administer
DROP POLICY IF EXISTS profiles_org_admin_membership_select ON profiles;
CREATE POLICY profiles_org_admin_membership_select ON profiles FOR SELECT
  USING (auth_is_org_admin_of(org_id));

-- Billing terms + license readable for administered orgs (even when not active)
DROP POLICY IF EXISTS org_billing_terms_org_admin_membership_select ON org_billing_terms;
CREATE POLICY org_billing_terms_org_admin_membership_select ON org_billing_terms
  FOR SELECT
  USING (auth_is_org_admin_of(org_id));

DROP POLICY IF EXISTS org_license_org_admin_membership_select ON org_license;
CREATE POLICY org_license_org_admin_membership_select ON org_license
  FOR SELECT
  USING (auth_is_org_admin_of(org_id));

-- 6) Switch active org (updates profiles.org_id + role from membership)
CREATE OR REPLACE FUNCTION switch_active_organization(p_org_id UUID)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership organization_memberships%ROWTYPE;
  v_profile profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_membership
  FROM organization_memberships
  WHERE user_id = auth.uid()
    AND org_id = p_org_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not a member of that organization';
  END IF;

  UPDATE profiles
  SET
    org_id = v_membership.org_id,
    role = v_membership.role,
    updated_at = now()
  WHERE id = auth.uid()
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

REVOKE ALL ON FUNCTION switch_active_organization(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION switch_active_organization(UUID) TO authenticated;

-- 7) Create org as org_admin (or existing org_admin) — SECURITY DEFINER, no destructive ops
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

  IF v_caller_role IS DISTINCT FROM 'org_admin' AND NOT v_is_org_admin AND v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only organization admins can create organizations';
  END IF;

  -- Generate a unique join code
  LOOP
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM organizations WHERE join_code = v_code);
  END LOOP;

  INSERT INTO organizations (name, join_code)
  VALUES (v_name, v_code)
  RETURNING * INTO v_org;

  INSERT INTO org_license (org_id, railnet_enabled, compliance_enabled, lms_enabled, plan)
  VALUES (v_org.id, false, false, true, 'lms')
  ON CONFLICT (org_id) DO NOTHING;

  -- Lock Standard catalog rates ($60 base); seat rates kept for legacy bill math
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

  -- Make the new org active for the caller
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

GRANT EXECUTE ON FUNCTION auth_member_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION auth_is_org_admin_of(UUID) TO authenticated;
