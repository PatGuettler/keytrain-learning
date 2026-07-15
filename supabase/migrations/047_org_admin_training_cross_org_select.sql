-- Org admins: read training data for every org they administer (reports / filters).
-- Write paths stay on the active org (auth_org_id). Additive only.

-- Assignments
DROP POLICY IF EXISTS assignments_select_org_admin ON assignments;
CREATE POLICY assignments_select_org_admin ON assignments
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = assignments.user_id
          AND auth_is_org_admin_of(p.org_id)
      )
    )
  );

-- Module attempts
DROP POLICY IF EXISTS attempts_org_admin_select ON module_attempts;
CREATE POLICY attempts_org_admin_select ON module_attempts
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = module_attempts.user_id
          AND auth_is_org_admin_of(p.org_id)
      )
    )
  );

-- Training sessions
DROP POLICY IF EXISTS sessions_org_admin_select ON training_sessions;
CREATE POLICY sessions_org_admin_select ON training_sessions
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = training_sessions.user_id
          AND auth_is_org_admin_of(p.org_id)
      )
    )
  );

-- Courses owned by managed orgs, or published to them, or monthly catalog
DROP POLICY IF EXISTS courses_select_org_admin ON courses;
CREATE POLICY courses_select_org_admin ON courses
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND (
        auth_is_org_admin_of(org_id)
        OR is_monthly_catalog = true
        OR EXISTS (
          SELECT 1
          FROM course_publications cp
          WHERE cp.course_id = courses.id
            AND auth_is_org_admin_of(cp.org_id)
            AND course_publication_is_active(
              cp.published_at,
              cp.available_until,
              cp.unpublished_at
            )
        )
      )
    )
  );

-- Publications for any managed org (SELECT only; writes stay on active-org policy)
DROP POLICY IF EXISTS course_publications_org_admin_membership_select ON course_publications;
CREATE POLICY course_publications_org_admin_membership_select ON course_publications
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR auth_is_org_admin_of(org_id)
  );

-- Modules for courses an org admin can already see
DROP POLICY IF EXISTS modules_select_org_admin ON modules;
CREATE POLICY modules_select_org_admin ON modules
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND EXISTS (
        SELECT 1
        FROM courses c
        WHERE c.id = modules.course_id
          AND (
            auth_is_org_admin_of(c.org_id)
            OR c.is_monthly_catalog = true
            OR EXISTS (
              SELECT 1
              FROM course_publications cp
              WHERE cp.course_id = c.id
                AND auth_is_org_admin_of(cp.org_id)
                AND course_publication_is_active(
                  cp.published_at,
                  cp.available_until,
                  cp.unpublished_at
                )
            )
          )
      )
    )
  );
