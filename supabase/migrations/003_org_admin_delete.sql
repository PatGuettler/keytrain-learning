-- Allow platform admins to delete hospital organizations.
CREATE POLICY org_admin_delete ON organizations FOR DELETE
  USING (auth_user_role() = 'admin');
