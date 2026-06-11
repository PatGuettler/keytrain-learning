-- Staff may only read courses/modules with an active publication for their org.

DROP POLICY IF EXISTS courses_select ON courses;

CREATE POLICY courses_select ON courses FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() IN ('employee', 'manager')
      AND EXISTS (
        SELECT 1 FROM course_publications p
        WHERE p.course_id = courses.id
          AND p.org_id = auth_org_id()
          AND course_publication_is_active(p.published_at, p.available_until, p.unpublished_at)
      )
    )
  );

DROP POLICY IF EXISTS modules_select ON modules;

CREATE POLICY modules_select ON modules FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() IN ('employee', 'manager')
      AND EXISTS (
        SELECT 1 FROM courses c
        INNER JOIN course_publications p ON p.course_id = c.id
        WHERE c.id = modules.course_id
          AND p.org_id = auth_org_id()
          AND course_publication_is_active(p.published_at, p.available_until, p.unpublished_at)
      )
    )
  );
