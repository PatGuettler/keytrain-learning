-- Org-aware phishing templates: headers, footers, and placeholders resolve per recipient at send time.

UPDATE phishing_templates SET
  sender_name = '{{COMPANY_NAME}} IT Support',
  subject = 'Action Required: Your {{COMPANY_NAME}} password expires in 24 hours',
  body_html = '<table width="600" align="center" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;"><tr><td style="padding:20px 24px;background-color:#0078D4;color:#ffffff;font-size:18px;font-weight:bold;">{{COMPANY_NAME}}<br/><span style="font-size:13px;font-weight:normal;opacity:0.9;">Information Technology</span></td></tr><tr><td style="padding:24px;"><p>Hello {{FIRST_NAME}},</p><p>Your {{COMPANY_NAME}} account requires a password reset within 24 hours. Reference ticket <strong>#INC-{{RANDOM_5_DIGITS}}</strong>.</p><p>Failure to reset may result in account lockout per {{COMPANY_NAME}} security policy.</p><p style="margin-top:24px;"><a href="{{TRACKING_LINK}}" style="background-color:#0078D4;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">Reset My Password Now</a></p><p style="font-size:12px;color:#666666;margin-top:24px;">{{COMPANY_NAME}} IT Helpdesk • {{SENDER_EMAIL}}<br/>Do not reply to this message</p></td></tr></table><img src="{{PIXEL_URL}}" width="1" height="1" style="display:none;" alt="" />',
  body_text = 'Hello {{FIRST_NAME}}, your {{COMPANY_NAME}} password expires in 24 hours. Reset here: {{TRACKING_LINK}} — {{COMPANY_NAME}} IT Helpdesk ({{SENDER_EMAIL}})'
WHERE pretext = 'it_helpdesk';

UPDATE phishing_templates SET
  sender_name = 'DocuSign via {{COMPANY_NAME}}',
  subject = '{{MANAGER_NAME}} sent you a document to review and sign — {{COMPANY_NAME}}',
  body_html = '<table width="600" align="center" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;"><tr><td style="padding:16px 24px;background-color:#1A1A2E;color:#ffffff;font-weight:bold;">DocuSign</td></tr><tr><td style="padding:24px;"><p>{{FULL_NAME}},</p><p>{{MANAGER_NAME}} at {{COMPANY_NAME}} sent you <strong>Q{{CURRENT_QUARTER}} Compliance Acknowledgment.pdf</strong> to review and sign.</p><p style="margin-top:20px;"><a href="{{LOGIN_URL}}" style="background-color:#F5C518;color:#1A1A2E;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">Review Document</a></p><p style="font-size:12px;color:#666666;margin-top:24px;">Sent on behalf of {{COMPANY_NAME}} • This link expires in 3 days.</p></td></tr></table><img src="{{PIXEL_URL}}" width="1" height="1" style="display:none;" alt="" />',
  body_text = '{{MANAGER_NAME}} at {{COMPANY_NAME}} sent you a document to sign: {{LOGIN_URL}}'
WHERE pretext = 'docusign';

UPDATE phishing_templates SET
  sender_name = '{{MANAGER_NAME}}',
  subject = 'Quick question — {{COMPANY_NAME}}',
  body_html = '<table width="600" align="center" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;"><tr><td style="padding:24px;"><p>Hi {{FIRST_NAME}},</p><p>Need you to review something before tomorrow''s meeting at {{COMPANY_NAME}} — time sensitive. Can you take a look when you get a chance?</p><p><a href="{{TRACKING_LINK}}">https://{{COMPANY_SLUG}}.sharepoint.com/sites/internal/review</a></p><p>Thanks,<br/>{{MANAGER_NAME}}<br/>{{COMPANY_NAME}}</p></td></tr></table><img src="{{PIXEL_URL}}" width="1" height="1" style="display:none;" alt="" />',
  body_text = 'Hi {{FIRST_NAME}}, please review for {{COMPANY_NAME}}: {{TRACKING_LINK}} — {{MANAGER_NAME}}'
WHERE pretext = 'executive';

UPDATE phishing_templates SET
  sender_name = '{{COMPANY_NAME}} Human Resources',
  subject = '{{COMPANY_NAME}}: Benefits open enrollment closes {{DEADLINE_DATE}}',
  body_html = '<table width="600" align="center" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;"><tr><td style="padding:20px 24px;background-color:#2E7D6B;color:#ffffff;font-size:18px;font-weight:bold;">{{COMPANY_NAME}}<br/><span style="font-size:13px;font-weight:normal;opacity:0.9;">Human Resources</span></td></tr><tr><td style="padding:24px;"><p>Dear {{FIRST_NAME}},</p><p>Open enrollment at {{COMPANY_NAME}} closes on <strong>{{DEADLINE_DATE}}</strong>. Please confirm your medical, dental, and FSA elections for the upcoming plan year.</p><p style="margin-top:20px;"><a href="{{LOGIN_URL}}" style="background-color:#2E7D6B;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">Review My Benefits</a></p><p style="font-size:12px;color:#666666;margin-top:24px;">{{COMPANY_NAME}} Human Resources • {{SENDER_EMAIL}}<br/>Failure to act may result in default plan enrollment.</p></td></tr></table><img src="{{PIXEL_URL}}" width="1" height="1" style="display:none;" alt="" />',
  body_text = 'Dear {{FIRST_NAME}}, {{COMPANY_NAME}} benefits enrollment closes {{DEADLINE_DATE}}. Review: {{LOGIN_URL}} — HR ({{SENDER_EMAIL}})'
WHERE pretext = 'hr';

UPDATE phishing_templates SET
  sender_name = 'Microsoft account team',
  subject = 'Unusual sign-in activity on your {{COMPANY_NAME}} Microsoft account',
  body_html = '<table width="600" align="center" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;"><tr><td style="padding:16px 24px;background-color:#0067B8;color:#ffffff;font-weight:bold;">Microsoft</td></tr><tr><td style="padding:24px;"><p>Hello {{FIRST_NAME}},</p><p>We detected unusual sign-in activity on the Microsoft work account associated with <strong>{{COMPANY_NAME}}</strong> from Lagos, Nigeria.</p><table cellpadding="6" style="font-size:13px;border:1px solid #dddddd;"><tr><td><strong>Organization</strong></td><td>{{COMPANY_NAME}}</td></tr><tr><td><strong>Date</strong></td><td>Today</td></tr><tr><td><strong>Location</strong></td><td>Lagos, Nigeria</td></tr><tr><td><strong>Device</strong></td><td>Windows PC</td></tr></table><p style="margin-top:20px;"><a href="{{LOGIN_URL}}" style="background-color:#0067B8;color:#ffffff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;">Secure my account</a></p></td></tr></table><img src="{{PIXEL_URL}}" width="1" height="1" style="display:none;" alt="" />',
  body_text = 'Unusual sign-in detected for {{FIRST_NAME}} at {{COMPANY_NAME}}. Secure your account: {{LOGIN_URL}}'
WHERE pretext = 'microsoft';

UPDATE phishing_templates SET
  sender_name = '{{COMPANY_NAME}} Payroll Department',
  subject = '{{COMPANY_NAME}}: Verify your direct deposit information',
  body_html = '<table width="600" align="center" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;"><tr><td style="padding:20px 24px;background-color:#1B5E20;color:#ffffff;font-size:18px;font-weight:bold;">{{COMPANY_NAME}}<br/><span style="font-size:13px;font-weight:normal;opacity:0.9;">Payroll Services</span></td></tr><tr><td style="padding:24px;"><p>Hello {{FIRST_NAME}},</p><p>Due to a payroll system update, all {{COMPANY_NAME}} employees must re-verify direct deposit information by <strong>{{DEADLINE_DATE}}</strong>.</p><p style="margin-top:20px;"><a href="{{LOGIN_URL}}" style="background-color:#1B5E20;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">Verify My Information</a></p><p style="font-size:12px;color:#666666;margin-top:24px;">{{COMPANY_NAME}} Payroll • {{SENDER_EMAIL}}<br/>Failure to verify may delay your next paycheck.</p></td></tr></table><img src="{{PIXEL_URL}}" width="1" height="1" style="display:none;" alt="" />',
  body_text = 'Hello {{FIRST_NAME}}, {{COMPANY_NAME}} payroll: verify direct deposit by {{DEADLINE_DATE}}: {{LOGIN_URL}} ({{SENDER_EMAIL}})'
WHERE pretext = 'payroll';
