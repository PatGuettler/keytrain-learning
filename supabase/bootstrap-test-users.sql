-- Dev/test users for Metro General Hospital (manager + employee).
-- Run after migrations, seed.sql, and bootstrap-admin.sql.
--
-- Login credentials (local testing only):
--   Manager:  manager@test.com  /  manager
--   Employee: employee@test.com /  employee
--
-- Creates auth users + profiles in one step. Safe to re-run (upserts).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Metro General Hospital (from seed.sql)
INSERT INTO organizations (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Metro General Hospital')
ON CONFLICT (id) DO NOTHING;

-- Fixed UUIDs so profiles stay linked across re-runs
-- Manager: 00000000-0000-0000-0000-000000000011
-- Employee: 00000000-0000-0000-0000-000000000012

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000011',
    'authenticated',
    'authenticated',
    'manager@test.com',
    crypt('manager', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test Manager"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000012',
    'authenticated',
    'authenticated',
    'employee@test.com',
    crypt('employee', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test Employee"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now();

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000011',
    'manager@test.com',
    '{"sub":"00000000-0000-0000-0000-000000000011","email":"manager@test.com"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000012',
    'employee@test.com',
    '{"sub":"00000000-0000-0000-0000-000000000012","email":"employee@test.com"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  )
ON CONFLICT (provider, provider_id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  identity_data = EXCLUDED.identity_data,
  updated_at = now();

INSERT INTO profiles (id, org_id, manager_id, full_name, email, role, is_active)
VALUES
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'Test Manager',
    'manager@test.com',
    'manager',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000011',
    'Test Employee',
    'employee@test.com',
    'employee',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  org_id = EXCLUDED.org_id,
  manager_id = EXCLUDED.manager_id,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_active = true;
