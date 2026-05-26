-- GuardianMD initial schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee');
CREATE TYPE module_type AS ENUM ('lesson', 'quiz', 'workshop');
CREATE TYPE assignment_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT,
  estimated_minutes INT NOT NULL DEFAULT 30,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type module_type NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date DATE,
  status assignment_status NOT NULL DEFAULT 'pending',
  force_retake BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (course_id, user_id)
);

CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  time_spent_seconds INT NOT NULL DEFAULT 0,
  score NUMERIC,
  passed BOOLEAN
);

CREATE TABLE module_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  time_spent_seconds INT NOT NULL DEFAULT 0,
  score NUMERIC,
  answers JSONB,
  interactions JSONB
);

-- Indexes
CREATE INDEX idx_profiles_org ON profiles(org_id);
CREATE INDEX idx_profiles_manager ON profiles(manager_id);
CREATE INDEX idx_courses_org ON courses(org_id);
CREATE INDEX idx_modules_course ON modules(course_id);
CREATE INDEX idx_assignments_user ON assignments(user_id);
CREATE INDEX idx_sessions_user ON training_sessions(user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Helper: get current user's org
CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_attempts ENABLE ROW LEVEL SECURITY;

-- Organizations: members can read their org
CREATE POLICY org_select ON organizations FOR SELECT
  USING (id = auth_org_id());

-- Profiles
CREATE POLICY profiles_select_own ON profiles FOR SELECT
  USING (id = auth.uid() OR org_id = auth_org_id());

CREATE POLICY profiles_select_team ON profiles FOR SELECT
  USING (
    auth_user_role() IN ('admin', 'manager')
    AND org_id = auth_org_id()
    AND (auth_user_role() = 'admin' OR manager_id = auth.uid() OR id = auth.uid())
  );

CREATE POLICY profiles_update_own ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY profiles_update_team ON profiles FOR UPDATE
  USING (
    auth_user_role() = 'manager' AND manager_id = auth.uid()
  );

CREATE POLICY profiles_admin_all ON profiles FOR ALL
  USING (auth_user_role() = 'admin' AND org_id = auth_org_id());

-- Courses
CREATE POLICY courses_select ON courses FOR SELECT
  USING (
    org_id = auth_org_id()
    AND (is_published = true OR auth_user_role() IN ('admin', 'manager'))
  );

CREATE POLICY courses_admin ON courses FOR ALL
  USING (auth_user_role() = 'admin' AND org_id = auth_org_id());

-- Modules (via course org)
CREATE POLICY modules_select ON modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = modules.course_id
        AND c.org_id = auth_org_id()
        AND (c.is_published = true OR auth_user_role() IN ('admin', 'manager'))
    )
  );

CREATE POLICY modules_admin ON modules FOR ALL
  USING (
    auth_user_role() = 'admin'
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = modules.course_id AND c.org_id = auth_org_id())
  );

-- Assignments
CREATE POLICY assignments_select_own ON assignments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY assignments_select_team ON assignments FOR SELECT
  USING (
    auth_user_role() IN ('admin', 'manager')
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = assignments.user_id AND p.org_id = auth_org_id())
    AND (
      auth_user_role() = 'admin'
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = assignments.user_id AND p.manager_id = auth.uid())
    )
  );

CREATE POLICY assignments_insert_manager ON assignments FOR INSERT
  WITH CHECK (
    auth_user_role() IN ('admin', 'manager')
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_id AND p.org_id = auth_org_id())
  );

CREATE POLICY assignments_update_manager ON assignments FOR UPDATE
  USING (
    auth_user_role() IN ('admin', 'manager')
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = assignments.user_id AND p.org_id = auth_org_id())
  );

CREATE POLICY assignments_delete_manager ON assignments FOR DELETE
  USING (auth_user_role() IN ('admin', 'manager'));

-- Training sessions
CREATE POLICY sessions_own ON training_sessions FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY sessions_team_select ON training_sessions FOR SELECT
  USING (
    auth_user_role() IN ('admin', 'manager')
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = training_sessions.user_id AND p.org_id = auth_org_id())
  );

-- Module attempts
CREATE POLICY attempts_own ON module_attempts FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY attempts_team_select ON module_attempts FOR SELECT
  USING (
    auth_user_role() IN ('admin', 'manager')
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = module_attempts.user_id AND p.org_id = auth_org_id())
  );

-- Storage buckets (run in Supabase dashboard or via API)
-- training-images: public read for org members
