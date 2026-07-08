-- Course completion certificates: settings on courses + issued certificate rows.

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS certificate_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS certificate_expires_days integer;

COMMENT ON COLUMN courses.certificate_enabled IS
  'When true, a certificate is issued automatically when a learner passes the course.';

COMMENT ON COLUMN courses.certificate_expires_days IS
  'Optional days after issuance until the certificate expires. NULL = no expiration.';

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS certificates_user_id_idx ON certificates (user_id);
CREATE INDEX IF NOT EXISTS certificates_course_id_idx ON certificates (course_id);

COMMENT ON TABLE certificates IS
  'One certificate per user/course; re-issued (upsert) when the learner passes again.';

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS certificates_select_own ON certificates;
CREATE POLICY certificates_select_own ON certificates FOR SELECT
  USING (
    user_id = auth.uid()
    OR auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'manager'
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = certificates.user_id
          AND p.manager_id = auth.uid()
      )
    )
  );

-- Learners do not insert directly; issue_course_certificate SECURITY DEFINER does.
DROP POLICY IF EXISTS certificates_admin_all ON certificates;
CREATE POLICY certificates_admin_all ON certificates FOR ALL
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

CREATE OR REPLACE FUNCTION issue_course_certificate(
  p_assignment_id UUID,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id UUID;
  v_assignment_user UUID;
  v_passed BOOLEAN;
  v_enabled BOOLEAN;
  v_expires_days INTEGER;
  v_cert_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id AND auth_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Not allowed to issue certificate for this user.';
  END IF;

  SELECT a.course_id, a.user_id, (a.status = 'completed')
  INTO v_course_id, v_assignment_user, v_passed
  FROM assignments a
  WHERE a.id = p_assignment_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Assignment not found.';
  END IF;

  IF v_assignment_user IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Assignment does not belong to this user.';
  END IF;

  IF NOT v_passed THEN
    RETURN NULL;
  END IF;

  SELECT c.certificate_enabled, c.certificate_expires_days
  INTO v_enabled, v_expires_days
  FROM courses c
  WHERE c.id = v_course_id;

  IF NOT COALESCE(v_enabled, false) THEN
    RETURN NULL;
  END IF;

  IF v_expires_days IS NOT NULL AND v_expires_days > 0 THEN
    v_expires_at := now() + make_interval(days => v_expires_days);
  ELSE
    v_expires_at := NULL;
  END IF;

  INSERT INTO certificates (user_id, course_id, assignment_id, issued_at, expires_at)
  VALUES (p_user_id, v_course_id, p_assignment_id, now(), v_expires_at)
  ON CONFLICT (user_id, course_id) DO UPDATE
    SET assignment_id = EXCLUDED.assignment_id,
        issued_at = EXCLUDED.issued_at,
        expires_at = EXCLUDED.expires_at
  RETURNING id INTO v_cert_id;

  RETURN v_cert_id;
END;
$$;

GRANT EXECUTE ON FUNCTION issue_course_certificate(UUID, UUID) TO authenticated;

-- Public bucket for course lesson PDFs (admin upload, public read).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-pdfs',
  'course-pdfs',
  true,
  26214400,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS course_pdfs_public_read ON storage.objects;
CREATE POLICY course_pdfs_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'course-pdfs');

DROP POLICY IF EXISTS course_pdfs_admin_insert ON storage.objects;
CREATE POLICY course_pdfs_admin_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'course-pdfs' AND auth_user_role() = 'admin');

DROP POLICY IF EXISTS course_pdfs_admin_update ON storage.objects;
CREATE POLICY course_pdfs_admin_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'course-pdfs' AND auth_user_role() = 'admin');

DROP POLICY IF EXISTS course_pdfs_admin_delete ON storage.objects;
CREATE POLICY course_pdfs_admin_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'course-pdfs' AND auth_user_role() = 'admin');
