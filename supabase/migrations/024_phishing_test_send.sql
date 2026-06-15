-- Test send: deliver to a subset of recipients without closing the campaign.

ALTER TABLE phishing_campaigns
  ADD COLUMN IF NOT EXISTS test_mode BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE phishing_recipients
  ADD COLUMN IF NOT EXISTS test_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN phishing_campaigns.test_mode IS 'When true, campaign is intended for test sends before a full production launch.';
COMMENT ON COLUMN phishing_recipients.test_sent_at IS 'Set when a test-mode send delivered to this recipient; production send uses sent_at.';
