-- Seed data for KeyTrain Learning
-- Run after applying 001_initial_schema.sql
-- Create real users in Supabase Auth, then insert matching rows in profiles.
-- Full course + module definitions live in src/data/courses.ts

INSERT INTO organizations (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Metro General Hospital'),
  ('00000000-0000-0000-0000-000000000099', 'Platform Administration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO courses (id, org_id, title, description, estimated_minutes, is_published, thumbnail_url) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Incident Awareness & Reporting',
    'Healthcare Course 6: Recognize incident types, report promptly, and protect patients, privacy, and operations.',
    60,
    true,
    null
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Cybersecurity Awareness',
    'Protect patient data and hospital systems from phishing and social engineering.',
    30,
    true,
    null
  )
ON CONFLICT (id) DO NOTHING;

-- Full module content for course 10000000-...001: run seed-incident-awareness-course.sql
-- Server room security course 10000000-...003: run seed-server-room-security-course.sql
