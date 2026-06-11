-- One-time bootstrap: create your hospital org and your admin account.
-- 1. Supabase → Authentication → Users → Add user (your email + password, Auto Confirm ON)
-- 2. Copy your User UID from that user
-- 3. Replace id / full_name / email below if needed, then run in SQL Editor

INSERT INTO organizations (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Metro General Hospital')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, org_id, manager_id, full_name, email, role, is_active)
VALUES (
  '57ca4836-1822-479f-ac0f-c9a1671a9001',
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'Pat Guettler',
  'patguettler@gmail.com',
  'admin',
  true
)
ON CONFLICT (id) DO UPDATE SET
  org_id = EXCLUDED.org_id,
  role = 'admin',
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;
