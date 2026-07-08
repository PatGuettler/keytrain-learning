-- Optional seed: Server Room Security & Cyber Safety course
-- Run after migrations. Adjust org publication separately via admin UI.

INSERT INTO courses (
  id,
  title,
  description,
  estimated_minutes,
  max_attempts,
  certificate_enabled,
  created_by,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000002',
  'Server Room Security & Cyber Safety',
  'Protect critical infrastructure: physical access, environmental awareness, and cyber hygiene for staff who work near or support data center spaces.',
  45,
  3,
  true,
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Modules are best loaded via Admin → Create Course → "Load Server Room Security"
-- which uses src/lib/course-templates/server-room-security.ts with full slide/workshop content.
