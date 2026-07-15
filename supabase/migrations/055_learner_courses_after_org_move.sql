-- Reliable learner course list after org moves (avoids nested RLS / embed drops).
-- Plus: ensure move path can rely on active destination membership.

CREATE OR REPLACE FUNCTION auth_active_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.org_id
  FROM organization_memberships m
  WHERE m.user_id = auth.uid()
    AND m.is_active = true
  UNION
  SELECT p.org_id
  FROM profiles p
  WHERE p.id = auth.uid()
    AND p.org_id IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION auth_active_org_ids() TO authenticated;

-- Staff may read publications for their active org (profile) or any active membership.
DROP POLICY IF EXISTS course_publications_select_org ON course_publications;
CREATE POLICY course_publications_select_org ON course_publications FOR SELECT
  USING (
    (
      org_id = auth_org_id()
      OR org_id IN (SELECT auth_active_org_ids())
    )
    AND course_publication_is_active(published_at, available_until, unpublished_at)
  );

-- Staff may read courses published to their active org / memberships.
DROP POLICY IF EXISTS courses_select ON courses;
CREATE POLICY courses_select ON courses FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() IN ('employee', 'manager', 'org_admin')
      AND EXISTS (
        SELECT 1 FROM course_publications p
        WHERE p.course_id = courses.id
          AND (
            p.org_id = auth_org_id()
            OR p.org_id IN (SELECT auth_active_org_ids())
          )
          AND course_publication_is_active(p.published_at, p.available_until, p.unpublished_at)
      )
    )
  );

DROP POLICY IF EXISTS modules_select ON modules;
CREATE POLICY modules_select ON modules FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() IN ('employee', 'manager', 'org_admin')
      AND EXISTS (
        SELECT 1 FROM courses c
        INNER JOIN course_publications p ON p.course_id = c.id
        WHERE c.id = modules.course_id
          AND (
            p.org_id = auth_org_id()
            OR p.org_id IN (SELECT auth_active_org_ids())
          )
          AND course_publication_is_active(p.published_at, p.available_until, p.unpublished_at)
      )
    )
  );

-- Service-friendly: list required courses for a user by profile.org_id (SECURITY DEFINER).
CREATE OR REPLACE FUNCTION list_required_courses_for_user(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  course_id UUID,
  publication_id UUID,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  estimated_minutes INT,
  max_attempts INT,
  show_results_after_completion BOOLEAN,
  certificate_enabled BOOLEAN,
  certificate_expires_days INT,
  org_id UUID,
  published_at TIMESTAMPTZ,
  available_until TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := COALESCE(p_user_id, auth.uid());
  v_org UUID;
  v_role user_role;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() IS NOT NULL
     AND v_uid IS DISTINCT FROM auth.uid()
     AND COALESCE(auth_user_role()::text, '') <> 'admin'
  THEN
    RAISE EXCEPTION 'Not allowed to list courses for another user.';
  END IF;

  SELECT p.org_id, p.role INTO v_org, v_role FROM profiles p WHERE p.id = v_uid;
  IF v_role = 'admin' OR v_org IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    cp.id,
    c.title,
    c.description,
    c.thumbnail_url,
    c.estimated_minutes,
    c.max_attempts,
    c.show_results_after_completion,
    c.certificate_enabled,
    c.certificate_expires_days,
    cp.org_id,
    cp.published_at,
    cp.available_until
  FROM course_publications cp
  JOIN courses c ON c.id = cp.course_id
  WHERE cp.org_id = v_org
    AND course_publication_is_active(cp.published_at, cp.available_until, cp.unpublished_at)
  ORDER BY c.title;
END;
$$;

GRANT EXECUTE ON FUNCTION list_required_courses_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION list_required_courses_for_user(UUID) TO service_role;
