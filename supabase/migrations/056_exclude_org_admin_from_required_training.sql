-- Org admins must not receive required training (same as platform admins).
-- Client already skips sync for org_admin (useAuth / useRequiredAssignmentSync)
-- and removed the org-admin "Required Training" nav. This migration:
--   1) Excludes org_admin from sync_user_required_assignments
--   2) Excludes org_admin from list_required_courses_for_user
--   3) Removes existing assignment rows for org_admin profiles
--      (training_sessions / module_attempts cascade; certificates SET NULL)

CREATE OR REPLACE FUNCTION sync_user_required_assignments(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_role user_role;
  pub RECORD;
  v_due DATE;
  v_caller_role user_role;
BEGIN
  IF auth.uid() IS NULL THEN
    NULL;
  ELSIF p_user_id = auth.uid() THEN
    NULL;
  ELSE
    v_caller_role := auth_user_role();
    IF v_caller_role IS DISTINCT FROM 'admin'::user_role
       AND NOT (
         v_caller_role = 'org_admin'::user_role
         AND EXISTS (
           SELECT 1
           FROM profiles target
           WHERE target.id = p_user_id
             AND auth_is_org_admin_of(target.org_id)
         )
       )
    THEN
      RAISE EXCEPTION 'Not allowed to sync assignments for another user.';
    END IF;
  END IF;

  SELECT org_id, role INTO v_org_id, v_role FROM profiles WHERE id = p_user_id;
  -- Learners only: managers and employees. Platform + org admins never get
  -- required-course assignments.
  IF v_role IN ('admin', 'org_admin') OR v_org_id IS NULL THEN
    RETURN;
  END IF;

  -- Permit due_date upserts owned by the learner without tripping the progress guard.
  PERFORM set_config('app.assignment_sync_ok', '1', true);

  FOR pub IN
    SELECT cp.course_id, cp.available_until, cp.published_by
    FROM course_publications cp
    WHERE cp.org_id = v_org_id
      AND course_publication_is_active(cp.published_at, cp.available_until, cp.unpublished_at)
  LOOP
    v_due := CASE WHEN pub.available_until IS NOT NULL THEN pub.available_until::date ELSE NULL END;

    INSERT INTO assignments (course_id, user_id, assigned_by, due_date, status)
    VALUES (pub.course_id, p_user_id, pub.published_by, v_due, 'pending')
    ON CONFLICT (course_id, user_id) DO UPDATE
      SET due_date = EXCLUDED.due_date
      WHERE assignments.status <> 'completed';
  END LOOP;
END;
$$;

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
  IF v_role IN ('admin', 'org_admin') OR v_org IS NULL THEN
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

GRANT EXECUTE ON FUNCTION sync_user_required_assignments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_user_required_assignments(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION list_required_courses_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION list_required_courses_for_user(UUID) TO service_role;

-- Remove required-training rows already assigned to org admins.
DELETE FROM assignments a
USING profiles p
WHERE a.user_id = p.id
  AND p.role = 'org_admin';
