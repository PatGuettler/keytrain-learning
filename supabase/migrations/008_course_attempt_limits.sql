-- Per-course attempt limits, assignment lockout, and admin unlock requests.

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 3
  CHECK (max_attempts >= 1);

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS attempts_used INT NOT NULL DEFAULT 0
  CHECK (attempts_used >= 0);

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

CREATE TABLE course_unlock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  message TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX course_unlock_requests_one_pending
  ON course_unlock_requests (assignment_id)
  WHERE status = 'pending';

CREATE INDEX idx_unlock_requests_status ON course_unlock_requests(status, requested_at DESC);

ALTER TABLE course_unlock_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY unlock_requests_admin_all ON course_unlock_requests FOR ALL
  USING (auth_user_role() = 'admin');

CREATE POLICY unlock_requests_user_select ON course_unlock_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY unlock_requests_user_insert ON course_unlock_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());
