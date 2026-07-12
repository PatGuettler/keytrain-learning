-- Phase 3: org_admin course staging (Both plan), LMS reporting reads,
-- assignment/publication org scope, phishing org-scoped. Additive only.

-- ── Helpers ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auth_org_has_lms()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_license l
    WHERE l.org_id = auth_org_id()
      AND l.lms_enabled = true
  );
$$;

CREATE OR REPLACE FUNCTION auth_org_has_railnet()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_license l
    WHERE l.org_id = auth_org_id()
      AND l.railnet_enabled = true
  );
$$;

CREATE OR REPLACE FUNCTION auth_org_plan_both()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_license l
    WHERE l.org_id = auth_org_id()
      AND l.plan = 'both'
      AND l.lms_enabled = true
      AND l.railnet_enabled = true
  );
$$;

CREATE OR REPLACE FUNCTION auth_can_access_course_staging()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'org_admin' AND auth_org_plan_both());
$$;

-- ── Course staging (org_admin, Both plan, own railnet org) ───────────────

DROP POLICY IF EXISTS course_staging_org_select ON course_staging;
CREATE POLICY course_staging_org_select ON course_staging
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_can_access_course_staging()
      AND railnet_org_id = auth_org_railnet_org_id()
    )
  );

DROP POLICY IF EXISTS course_staging_org_insert ON course_staging;
CREATE POLICY course_staging_org_insert ON course_staging
  FOR INSERT
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_can_access_course_staging()
      AND railnet_org_id = auth_org_railnet_org_id()
    )
  );

DROP POLICY IF EXISTS course_staging_org_update ON course_staging;
CREATE POLICY course_staging_org_update ON course_staging
  FOR UPDATE
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_can_access_course_staging()
      AND railnet_org_id = auth_org_railnet_org_id()
    )
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_can_access_course_staging()
      AND railnet_org_id = auth_org_railnet_org_id()
    )
  );

-- ── Course publications (org_admin can publish catalog courses to own org) ─

DROP POLICY IF EXISTS course_publications_org_admin ON course_publications;
CREATE POLICY course_publications_org_admin ON course_publications
  FOR ALL
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_lms()
      AND org_id = auth_org_id()
    )
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_lms()
      AND org_id = auth_org_id()
    )
  );

-- ── Assignments: org_admin org-wide; manager insert for direct reports ───

DROP POLICY IF EXISTS assignments_select_org_admin ON assignments;
CREATE POLICY assignments_select_org_admin ON assignments
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_lms()
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = assignments.user_id
          AND p.org_id = auth_org_id()
      )
    )
  );

DROP POLICY IF EXISTS assignments_insert_org_admin ON assignments;
CREATE POLICY assignments_insert_org_admin ON assignments
  FOR INSERT
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_lms()
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = assignments.user_id
          AND p.org_id = auth_org_id()
      )
    )
  );

DROP POLICY IF EXISTS assignments_insert_manager ON assignments;
CREATE POLICY assignments_insert_manager ON assignments
  FOR INSERT
  WITH CHECK (
    auth_user_role() = 'manager'
    AND auth_org_has_lms()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = assignments.user_id
        AND p.org_id = auth_org_id()
        AND p.manager_id = auth.uid()
    )
  );

-- Attempts / sessions: org_admin org-wide read for LMS dashboard
DROP POLICY IF EXISTS attempts_org_admin_select ON module_attempts;
CREATE POLICY attempts_org_admin_select ON module_attempts
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_lms()
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = module_attempts.user_id
          AND p.org_id = auth_org_id()
      )
    )
  );

DROP POLICY IF EXISTS sessions_org_admin_select ON training_sessions;
CREATE POLICY sessions_org_admin_select ON training_sessions
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_lms()
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = training_sessions.user_id
          AND p.org_id = auth_org_id()
      )
    )
  );

-- Courses: org_admin can read published courses for their org (+ own-org drafts if any)
DROP POLICY IF EXISTS courses_select_org_admin ON courses;
CREATE POLICY courses_select_org_admin ON courses
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_lms()
      AND (
        org_id = auth_org_id()
            OR EXISTS (
              SELECT 1 FROM course_publications cp
              WHERE cp.course_id = courses.id
                AND cp.org_id = auth_org_id()
                AND course_publication_is_active(cp.published_at, cp.available_until, cp.unpublished_at)
            )
      )
    )
  );

-- ── Phishing: org_admin when RailNet entitled ─────────────────────────────

DROP POLICY IF EXISTS phishing_templates_org_select ON phishing_templates;
CREATE POLICY phishing_templates_org_select ON phishing_templates
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'org_admin' AND auth_org_has_railnet())
  );

DROP POLICY IF EXISTS phishing_campaigns_org_all ON phishing_campaigns;
CREATE POLICY phishing_campaigns_org_all ON phishing_campaigns
  FOR ALL
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_railnet()
      AND org_id = auth_org_id()
    )
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_railnet()
      AND org_id = auth_org_id()
    )
  );

DROP POLICY IF EXISTS phishing_recipients_org_all ON phishing_recipients;
CREATE POLICY phishing_recipients_org_all ON phishing_recipients
  FOR ALL
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_railnet()
      AND EXISTS (
        SELECT 1 FROM phishing_campaigns c
        WHERE c.id = phishing_recipients.campaign_id
          AND c.org_id = auth_org_id()
      )
    )
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_railnet()
      AND EXISTS (
        SELECT 1 FROM phishing_campaigns c
        WHERE c.id = phishing_recipients.campaign_id
          AND c.org_id = auth_org_id()
      )
    )
  );

DROP POLICY IF EXISTS phishing_events_org_all ON phishing_events;
CREATE POLICY phishing_events_org_all ON phishing_events
  FOR ALL
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_railnet()
      AND EXISTS (
        SELECT 1 FROM phishing_campaigns c
        WHERE c.id = phishing_events.campaign_id
          AND c.org_id = auth_org_id()
      )
    )
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_railnet()
      AND EXISTS (
        SELECT 1 FROM phishing_campaigns c
        WHERE c.id = phishing_events.campaign_id
          AND c.org_id = auth_org_id()
      )
    )
  );

-- ── Monthly catalog flag on courses (KTL-published security packs) ────────

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS is_monthly_catalog BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN courses.is_monthly_catalog IS
  'When true, course appears in org_admin monthly security catalog for subscribe/publish to own org.';

-- Modules readable when parent course is readable to org_admin
DROP POLICY IF EXISTS courses_insert_org_admin ON courses;
CREATE POLICY courses_insert_org_admin ON courses
  FOR INSERT
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_lms()
      AND org_id = auth_org_id()
    )
  );

DROP POLICY IF EXISTS courses_update_org_admin ON courses;
CREATE POLICY courses_update_org_admin ON courses
  FOR UPDATE
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_lms()
      AND org_id = auth_org_id()
    )
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_lms()
      AND org_id = auth_org_id()
    )
  );

DROP POLICY IF EXISTS modules_write_org_admin ON modules;
CREATE POLICY modules_write_org_admin ON modules
  FOR ALL
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_lms()
      AND EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = modules.course_id
          AND c.org_id = auth_org_id()
      )
    )
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_lms()
      AND EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = modules.course_id
          AND c.org_id = auth_org_id()
      )
    )
  );

DROP POLICY IF EXISTS modules_select_org_admin ON modules;
CREATE POLICY modules_select_org_admin ON modules
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_lms()
      AND EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = modules.course_id
          AND (
            c.org_id = auth_org_id()
            OR EXISTS (
              SELECT 1 FROM course_publications cp
              WHERE cp.course_id = c.id
                AND cp.org_id = auth_org_id()
                AND course_publication_is_active(cp.published_at, cp.available_until, cp.unpublished_at)
            )
            OR c.is_monthly_catalog = true
          )
      )
    )
  );

-- Org admins can browse monthly catalog courses (platform-owned)
DROP POLICY IF EXISTS courses_select_monthly_catalog ON courses;
CREATE POLICY courses_select_monthly_catalog ON courses
  FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'org_admin'
      AND auth_org_has_lms()
      AND is_monthly_catalog = true
    )
  );

CREATE INDEX IF NOT EXISTS courses_monthly_catalog_idx
  ON courses (is_monthly_catalog)
  WHERE is_monthly_catalog = true;
