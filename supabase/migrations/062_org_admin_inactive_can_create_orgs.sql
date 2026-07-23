-- Org admins marked inactive were hidden from organization_memberships queries (is_active=false)
-- and skipped by the 061 grandfather when p.is_active = false. Re-enable multi-org for those orgs.

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

-- Ensure profile-only org admins have a membership row (even when inactive).
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
