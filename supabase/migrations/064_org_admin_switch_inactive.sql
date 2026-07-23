-- Org admins with inactive accounts (or missing membership rows) could not switch org context.

CREATE OR REPLACE FUNCTION switch_active_organization(p_org_id UUID)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership organization_memberships%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_can_switch BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_membership
  FROM organization_memberships
  WHERE user_id = auth.uid()
    AND org_id = p_org_id
    AND role = 'org_admin';

  IF FOUND THEN
    v_can_switch := true;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'org_admin'
        AND p.org_id = p_org_id
    ) INTO v_can_switch;
  END IF;

  IF NOT v_can_switch THEN
    RAISE EXCEPTION 'You are not a member of that organization';
  END IF;

  IF FOUND THEN
    UPDATE profiles
    SET
      org_id = v_membership.org_id,
      role = v_membership.role,
      updated_at = now()
    WHERE id = auth.uid()
    RETURNING * INTO v_profile;
  ELSE
    UPDATE profiles
    SET
      org_id = p_org_id,
      role = 'org_admin',
      updated_at = now()
    WHERE id = auth.uid()
    RETURNING * INTO v_profile;
  END IF;

  INSERT INTO organization_memberships (user_id, org_id, role, is_active)
  VALUES (auth.uid(), p_org_id, 'org_admin', COALESCE(v_profile.is_active, true))
  ON CONFLICT (user_id, org_id) DO UPDATE SET
    role = 'org_admin',
    updated_at = now();

  RETURN v_profile;
END;
$$;

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
