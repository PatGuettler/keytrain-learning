-- Org admins may run phishing for any managed org with phishing_enabled,
-- not only the currently active profiles.org_id.

CREATE OR REPLACE FUNCTION auth_org_admin_has_phishing(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_memberships m
    JOIN org_license l ON l.org_id = m.org_id
    WHERE m.user_id = auth.uid()
      AND m.org_id = p_org_id
      AND m.role = 'org_admin'
      AND m.is_active = true
      AND l.phishing_enabled = true
  );
$$;

GRANT EXECUTE ON FUNCTION auth_org_admin_has_phishing(UUID) TO authenticated;

-- Templates: browse if admin of any phishing-enabled org (or active org has it)
DROP POLICY IF EXISTS phishing_templates_org_select ON phishing_templates;
CREATE POLICY phishing_templates_org_select ON phishing_templates
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND (
        auth_org_has_phishing()
        OR EXISTS (
          SELECT 1
          FROM organization_memberships m
          JOIN org_license l ON l.org_id = m.org_id
          WHERE m.user_id = auth.uid()
            AND m.role = 'org_admin'
            AND m.is_active = true
            AND l.phishing_enabled = true
        )
      )
    )
  );

DROP POLICY IF EXISTS phishing_campaigns_org_all ON phishing_campaigns;
CREATE POLICY phishing_campaigns_org_all ON phishing_campaigns
  FOR ALL
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND org_id IS NOT NULL
      AND auth_org_admin_has_phishing(org_id)
    )
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND org_id IS NOT NULL
      AND auth_org_admin_has_phishing(org_id)
    )
  );

DROP POLICY IF EXISTS phishing_recipients_org_all ON phishing_recipients;
CREATE POLICY phishing_recipients_org_all ON phishing_recipients
  FOR ALL
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND EXISTS (
        SELECT 1 FROM phishing_campaigns c
        WHERE c.id = phishing_recipients.campaign_id
          AND c.org_id IS NOT NULL
          AND auth_org_admin_has_phishing(c.org_id)
      )
    )
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND EXISTS (
        SELECT 1 FROM phishing_campaigns c
        WHERE c.id = phishing_recipients.campaign_id
          AND c.org_id IS NOT NULL
          AND auth_org_admin_has_phishing(c.org_id)
      )
    )
  );

DROP POLICY IF EXISTS phishing_events_org_all ON phishing_events;
CREATE POLICY phishing_events_org_all ON phishing_events
  FOR ALL
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND EXISTS (
        SELECT 1 FROM phishing_campaigns c
        WHERE c.id = phishing_events.campaign_id
          AND c.org_id IS NOT NULL
          AND auth_org_admin_has_phishing(c.org_id)
      )
    )
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND EXISTS (
        SELECT 1 FROM phishing_campaigns c
        WHERE c.id = phishing_events.campaign_id
          AND c.org_id IS NOT NULL
          AND auth_org_admin_has_phishing(c.org_id)
      )
    )
  );
