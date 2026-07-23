-- Grade history / manager reports: show course titles after unpublish or expiry.
-- Assignments remain readable; the courses embed was null because courses_select
-- only allowed actively published catalog courses.
--
-- Subquery inherits assignments RLS — users only see courses tied to assignments
-- they are already allowed to read (own, team, org admin, etc.).

CREATE POLICY courses_select_via_assignment ON courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM assignments a
      WHERE a.course_id = courses.id
    )
  );

CREATE POLICY modules_select_via_assignment ON modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM assignments a
      WHERE a.course_id = modules.course_id
    )
  );
