-- Platform admins read all training sessions and module attempts (cross-hospital reporting).

CREATE POLICY sessions_admin_select ON training_sessions FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY attempts_admin_select ON module_attempts FOR SELECT
  USING (auth_user_role() = 'admin');
