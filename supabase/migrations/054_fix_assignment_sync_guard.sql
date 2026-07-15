-- sync_user_required_assignments uses ON CONFLICT DO UPDATE for due dates.
-- guard_assignment_user_update still sees the caller JWT (auth.uid()), so learners
-- hit: "Assignment progress must be recorded through completion." → HTTP 400.
-- Allow a sync-only GUC (same pattern as app.assignment_progress_ok in 052).

CREATE OR REPLACE FUNCTION guard_assignment_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF current_setting('app.assignment_progress_ok', true) = '1' THEN
    RETURN NEW;
  END IF;

  IF current_setting('app.assignment_sync_ok', true) = '1' THEN
    RETURN NEW;
  END IF;

  IF auth_user_role() IN ('admin', 'manager') THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Assignment progress must be recorded through training completion.';
  END IF;

  RETURN NEW;
END;
$$;

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
  IF v_role = 'admin' OR v_org_id IS NULL THEN
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

GRANT EXECUTE ON FUNCTION sync_user_required_assignments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_user_required_assignments(UUID) TO service_role;
