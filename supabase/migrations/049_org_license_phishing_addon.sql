-- Paid add-on: org-level phishing simulations (independent of RailNet).
-- Additive only. Backfill: orgs that already had RailNet keep phishing on.

ALTER TABLE org_license
  ADD COLUMN IF NOT EXISTS phishing_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN org_license.phishing_enabled IS
  'Paid phishing simulations add-on. Independent of railnet_enabled.';

UPDATE org_license
SET phishing_enabled = true
WHERE railnet_enabled = true
  AND phishing_enabled = false;

CREATE OR REPLACE FUNCTION auth_org_has_phishing()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_license l
    WHERE l.org_id = auth_org_id()
      AND l.phishing_enabled = true
  );
$$;

GRANT EXECUTE ON FUNCTION auth_org_has_phishing() TO authenticated;

-- Phishing RLS: org admins need the phishing add-on (not RailNet alone)
DROP POLICY IF EXISTS phishing_templates_org_select ON phishing_templates;
CREATE POLICY phishing_templates_org_select ON phishing_templates
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'org_admin' AND auth_org_has_phishing())
  );

DROP POLICY IF EXISTS phishing_campaigns_org_all ON phishing_campaigns;
CREATE POLICY phishing_campaigns_org_all ON phishing_campaigns
  FOR ALL
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_phishing()
      AND org_id = auth_org_id()
    )
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_phishing()
      AND org_id = auth_org_id()
    )
  );

DROP POLICY IF EXISTS phishing_recipients_org_all ON phishing_recipients;
CREATE POLICY phishing_recipients_org_all ON phishing_recipients
  FOR ALL
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_phishing()
      AND EXISTS (
        SELECT 1 FROM phishing_campaigns c
        WHERE c.id = phishing_recipients.campaign_id
          AND c.org_id = auth_org_id()
      )
    )
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_phishing()
      AND EXISTS (
        SELECT 1 FROM phishing_campaigns c
        WHERE c.id = phishing_recipients.campaign_id
          AND c.org_id = auth_org_id()
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
      AND auth_org_has_phishing()
      AND EXISTS (
        SELECT 1 FROM phishing_campaigns c
        WHERE c.id = phishing_events.campaign_id
          AND c.org_id = auth_org_id()
      )
    )
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_phishing()
      AND EXISTS (
        SELECT 1 FROM phishing_campaigns c
        WHERE c.id = phishing_events.campaign_id
          AND c.org_id = auth_org_id()
      )
    )
  );
