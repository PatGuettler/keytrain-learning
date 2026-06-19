-- Seed phishing email templates (run after 022_phishing_simulation.sql).
-- Admins can customize templates in the database or via future UI.

INSERT INTO phishing_templates (
  name, pretext, sender_name, sender_email_local, subject, body_html, body_text, difficulty, red_flags
) VALUES
(
  'IT Password Reset',
  'it_helpdesk',
  'IT Support Team',
  'it-support',
  'Action Required: Your {{COMPANY_NAME}} password expires in 24 hours',
  '<table width="600" align="center" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;"><tr><td style="padding:20px 24px;background-color:#0078D4;color:#ffffff;font-size:18px;font-weight:bold;">{{COMPANY_NAME}}<br/><span style="font-size:13px;font-weight:normal;opacity:0.9;">Information Technology</span></td></tr><tr><td style="padding:24px;"><p>Hello {{FIRST_NAME}},</p><p>Your {{COMPANY_NAME}} account requires a password reset within 24 hours. Reference ticket <strong>#INC-{{RANDOM_5_DIGITS}}</strong>.</p><p>Failure to reset may result in account lockout per {{COMPANY_NAME}} security policy.</p><p style="margin-top:24px;"><a href="{{TRACKING_LINK}}" style="background-color:#0078D4;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">Reset My Password Now</a></p><p style="font-size:12px;color:#666666;margin-top:24px;">{{COMPANY_NAME}} IT Helpdesk • {{SENDER_EMAIL}}<br/>Do not reply to this message</p></td></tr></table><img src="{{PIXEL_URL}}" width="1" height="1" style="display:none;" alt="" />',
  'Hello {{FIRST_NAME}}, your {{COMPANY_NAME}} password expires in 24 hours. Reset here: {{TRACKING_LINK}} — {{COMPANY_NAME}} IT Helpdesk ({{SENDER_EMAIL}})',
  'medium',
  '["Sender domain may not match your real IT department","Urgent 24-hour deadline is a pressure tactic","Legitimate IT rarely asks you to reset via email link","Hovering the link shows an unexpected URL"]'::jsonb
),
(
  'DocuSign Document',
  'docusign',
  'DocuSign via {{COMPANY_NAME}}',
  'noreply',
  '{{SENDER_NAME}} sent you a document to review and sign',
  '<table width="600" align="center" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;"><tr><td style="padding:16px 24px;background-color:#1A1A2E;color:#ffffff;font-weight:bold;">DocuSign</td></tr><tr><td style="padding:24px;"><p>{{FULL_NAME}},</p><p>{{MANAGER_NAME}} sent you <strong>Q{{CURRENT_QUARTER}} Compliance Acknowledgment.pdf</strong> to review and sign.</p><p style="margin-top:20px;"><a href="{{LOGIN_URL}}" style="background-color:#F5C518;color:#1A1A2E;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">Review Document</a></p><p style="font-size:12px;color:#666666;margin-top:24px;">This link expires in 3 days.</p></td></tr></table><img src="{{PIXEL_URL}}" width="1" height="1" style="display:none;" alt="" />',
  '{{MANAGER_NAME}} sent you a document to sign: {{LOGIN_URL}}',
  'medium',
  '["Check whether the sender email domain is really DocuSign","Unexpected document requests should be verified with the sender","Urgent signing requests are a common phishing tactic","The link destination may not be docusign.com"]'::jsonb
),
(
  'Executive Quick Request',
  'executive',
  '{{MANAGER_NAME}}',
  'ceo',
  'Quick question',
  '<table width="600" align="center" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;"><tr><td style="padding:24px;"><p>Hi {{FIRST_NAME}},</p><p>Need you to review something before tomorrow''s meeting — time sensitive. Can you take a look at this when you get a chance?</p><p><a href="{{TRACKING_LINK}}">https://sharepoint.company.com/review/doc</a></p><p>Thanks,<br/>{{MANAGER_NAME}}<br/>Director</p></td></tr></table><img src="{{PIXEL_URL}}" width="1" height="1" style="display:none;" alt="" />',
  'Hi {{FIRST_NAME}}, please review: {{TRACKING_LINK}} — {{MANAGER_NAME}}',
  'hard',
  '["Executives rarely send bare links without context","Verify urgent requests through a separate channel","The URL does not match a real SharePoint address","Unexpected personal tone from leadership can be spoofed"]'::jsonb
),
(
  'HR Benefits Enrollment',
  'hr',
  '{{COMPANY_NAME}} Human Resources',
  'hr-benefits',
  'Reminder: Benefits open enrollment closes {{DEADLINE_DATE}}',
  '<table width="600" align="center" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;"><tr><td style="padding:20px 24px;background-color:#2E7D6B;color:#ffffff;font-size:18px;font-weight:bold;">Human Resources</td></tr><tr><td style="padding:24px;"><p>Dear {{FIRST_NAME}},</p><p>Open enrollment at {{COMPANY_NAME}} closes on <strong>{{DEADLINE_DATE}}</strong>. Please confirm your medical, dental, and FSA elections.</p><p style="margin-top:20px;"><a href="{{LOGIN_URL}}" style="background-color:#2E7D6B;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">Review My Benefits</a></p><p style="font-size:12px;color:#666666;margin-top:24px;">Failure to act may result in default plan enrollment.</p></td></tr></table><img src="{{PIXEL_URL}}" width="1" height="1" style="display:none;" alt="" />',
  'Dear {{FIRST_NAME}}, benefits enrollment closes {{DEADLINE_DATE}}. Review: {{LOGIN_URL}}',
  'medium',
  '["Confirm enrollment deadlines with HR directly","Benefits portals use your company''s known URL","Unexpected urgency around payroll/benefits is common in phishing","Check the sender address carefully"]'::jsonb
),
(
  'Microsoft Security Alert',
  'microsoft',
  'Microsoft account team',
  'account-security',
  'Unusual sign-in activity on your Microsoft account',
  '<table width="600" align="center" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;"><tr><td style="padding:16px 24px;background-color:#0067B8;color:#ffffff;font-weight:bold;">Microsoft</td></tr><tr><td style="padding:24px;"><p>Hello {{FIRST_NAME}},</p><p>We detected unusual sign-in activity on your account from Lagos, Nigeria.</p><table cellpadding="6" style="font-size:13px;border:1px solid #dddddd;"><tr><td><strong>Date</strong></td><td>Today</td></tr><tr><td><strong>Location</strong></td><td>Lagos, Nigeria</td></tr><tr><td><strong>Device</strong></td><td>Windows PC</td></tr></table><p style="margin-top:20px;"><a href="{{LOGIN_URL}}" style="background-color:#0067B8;color:#ffffff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;">Secure my account</a></p></td></tr></table><img src="{{PIXEL_URL}}" width="1" height="1" style="display:none;" alt="" />',
  'Unusual sign-in detected for {{FIRST_NAME}}. Secure your account: {{LOGIN_URL}}',
  'hard',
  '["Microsoft security emails come from known Microsoft domains","Sign-in alerts should be verified in your account portal","Unexpected foreign locations warrant caution but verify independently","Never enter credentials from an email link"]'::jsonb
),
(
  'Payroll Direct Deposit',
  'payroll',
  '{{COMPANY_NAME}} Payroll Department',
  'payroll',
  'Action Required: Verify your direct deposit information',
  '<table width="600" align="center" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;"><tr><td style="padding:20px 24px;background-color:#1B5E20;color:#ffffff;font-size:18px;font-weight:bold;">Payroll</td></tr><tr><td style="padding:24px;"><p>Hello {{FIRST_NAME}},</p><p>Due to a payroll system update, all {{COMPANY_NAME}} employees must re-verify direct deposit information by <strong>{{DEADLINE_DATE}}</strong>.</p><p style="margin-top:20px;"><a href="{{LOGIN_URL}}" style="background-color:#1B5E20;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">Verify My Information</a></p><p style="font-size:12px;color:#666666;margin-top:24px;">Failure to verify may delay your next paycheck.</p></td></tr></table><img src="{{PIXEL_URL}}" width="1" height="1" style="display:none;" alt="" />',
  'Hello {{FIRST_NAME}}, verify direct deposit by {{DEADLINE_DATE}}: {{LOGIN_URL}}',
  'hard',
  '["Payroll changes are rarely requested by email link","Threats about delayed paychecks create false urgency","Contact payroll through known internal channels","Check that the sender domain matches your employer"]'::jsonb
);
