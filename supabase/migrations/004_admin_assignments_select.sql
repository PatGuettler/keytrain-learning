-- Platform admins can read assignments across all hospitals for dashboard reporting.
CREATE POLICY assignments_admin_select ON assignments FOR SELECT
  USING (auth_user_role() = 'admin');
