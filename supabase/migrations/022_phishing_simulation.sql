-- Phishing simulation module (platform admin only).
-- Emails are sent via Resend from send-phishing-campaign Edge Function.

CREATE TABLE phishing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pretext TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email_local TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  red_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE phishing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  template_id UUID REFERENCES phishing_templates(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL DEFAULT '',
  pretext TEXT,
  fake_login_url TEXT,
  track_opens BOOLEAN NOT NULL DEFAULT true,
  target_scope TEXT NOT NULL DEFAULT 'org' CHECK (target_scope IN ('all', 'org', 'custom')),
  target_user_ids UUID[] NOT NULL DEFAULT '{}',
  exclude_admins BOOLEAN NOT NULL DEFAULT true,
  deadline_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'complete')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  auto_remediate BOOLEAN NOT NULL DEFAULT false,
  remediation_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE phishing_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES phishing_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id)
);

CREATE TABLE phishing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES phishing_campaigns(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES phishing_recipients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('open', 'click', 'credential_submission', 'training_viewed')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX phishing_campaigns_org_id_idx ON phishing_campaigns(org_id);
CREATE INDEX phishing_campaigns_status_idx ON phishing_campaigns(status);
CREATE INDEX phishing_recipients_campaign_id_idx ON phishing_recipients(campaign_id);
CREATE INDEX phishing_recipients_token_idx ON phishing_recipients(token);
CREATE INDEX phishing_events_campaign_id_idx ON phishing_events(campaign_id);
CREATE INDEX phishing_events_recipient_id_idx ON phishing_events(recipient_id);
CREATE INDEX phishing_events_user_id_idx ON phishing_events(user_id);

ALTER TABLE phishing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE phishing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE phishing_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE phishing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY phishing_templates_admin_select ON phishing_templates
  FOR SELECT USING (auth_user_role() = 'admin');

CREATE POLICY phishing_campaigns_admin_all ON phishing_campaigns
  FOR ALL USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY phishing_recipients_admin_all ON phishing_recipients
  FOR ALL USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY phishing_events_admin_select ON phishing_events
  FOR SELECT USING (auth_user_role() = 'admin');

COMMENT ON TABLE phishing_campaigns IS 'Phishing simulation campaigns — platform admin only.';
COMMENT ON COLUMN phishing_campaigns.fake_login_url IS 'Static fake login page URL (Cloudflare Pages or /phishing-sim/login.html).';
COMMENT ON COLUMN phishing_campaigns.status IS 'draft | scheduled | sent | complete';
