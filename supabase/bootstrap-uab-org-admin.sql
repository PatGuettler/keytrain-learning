-- UAB org admin test user (local / staging only).
-- Prerequisites: migrations through 043 (org_admin role). Run in Supabase SQL Editor.
--
-- Login:
--   Email:    orgadmin@test.com
--   Password: asdf1234ASDF!@#$
--   Role:     org_admin
--   Org:      first organization whose name contains "UAB" (case-insensitive)
--
-- Safe to re-run (upserts auth + profile). Does not create a second UAB org if one exists.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_org_id uuid;
  v_user_id uuid := '00000000-0000-0000-0000-000000000013';
  v_email text := 'orgadmin@test.com';
  v_password text := 'asdf1234ASDF!@#$';
  v_full_name text := 'orgadmin@test.com';
BEGIN
  SELECT id
  INTO v_org_id
  FROM organizations
  WHERE name ILIKE '%UAB%'
    AND id <> '00000000-0000-0000-0000-000000000099'
  ORDER BY created_at
  LIMIT 1;

  IF v_org_id IS NULL THEN
    v_org_id := '00000000-0000-0000-0000-000000000002';
    INSERT INTO organizations (id, name)
    VALUES (v_org_id, 'UAB')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    RAISE NOTICE 'Created organization UAB (%)', v_org_id;
  ELSE
    RAISE NOTICE 'Using existing UAB organization %', v_org_id;
  END IF;

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
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', v_full_name),
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
  ) VALUES (
    v_user_id,
    v_user_id,
    v_email,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

  INSERT INTO profiles (
    id,
    org_id,
    manager_id,
    full_name,
    email,
    role,
    is_active,
    invitation_pending
  ) VALUES (
    v_user_id,
    v_org_id,
    NULL,
    v_full_name,
    v_email,
    'org_admin',
    true,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    org_id = EXCLUDED.org_id,
    manager_id = NULL,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = 'org_admin',
    is_active = true,
    invitation_pending = false,
    updated_at = now();

  -- Ensure license row exists; leave flags so KTL admin can toggle for demos.
  -- Default demo ON: RailNet + phishing + LMS (KeyTrain w/ Intelligence).
  INSERT INTO org_license (org_id, railnet_enabled, compliance_enabled, lms_enabled, phishing_enabled, plan)
  VALUES (v_org_id, true, true, true, true, 'both')
  ON CONFLICT (org_id) DO UPDATE SET
    updated_at = now();

  INSERT INTO organization_memberships (user_id, org_id, role, is_active)
  VALUES (v_user_id, v_org_id, 'org_admin', true)
  ON CONFLICT (user_id, org_id) DO UPDATE SET
    role = 'org_admin',
    is_active = true,
    updated_at = now();

END $$;
