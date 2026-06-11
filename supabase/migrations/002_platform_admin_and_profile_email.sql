-- Platform admins can manage all hospitals (organizations) and users across orgs.
-- Adds email to profiles for admin user lists (synced on invite/import).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON profiles (lower(email))
  WHERE email IS NOT NULL;

-- Organizations: admins see and manage all orgs; members see their own.
DROP POLICY IF EXISTS org_select ON organizations;
CREATE POLICY org_select ON organizations FOR SELECT
  USING (id = auth_org_id() OR auth_user_role() = 'admin');

CREATE POLICY org_admin_insert ON organizations FOR INSERT
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY org_admin_update ON organizations FOR UPDATE
  USING (auth_user_role() = 'admin');

-- Profiles: admins manage users in any organization.
DROP POLICY IF EXISTS profiles_admin_all ON profiles;
CREATE POLICY profiles_admin_all ON profiles FOR ALL
  USING (auth_user_role() = 'admin');

-- Courses & modules: admins manage content for any org.
DROP POLICY IF EXISTS courses_admin ON courses;
CREATE POLICY courses_admin ON courses FOR ALL
  USING (auth_user_role() = 'admin');

DROP POLICY IF EXISTS modules_admin ON modules;
CREATE POLICY modules_admin ON modules FOR ALL
  USING (auth_user_role() = 'admin');
