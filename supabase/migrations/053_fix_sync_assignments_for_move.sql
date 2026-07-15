-- Allow service-role / edge-function sync after admin org moves.
-- Previously: auth.uid() IS NULL left the gate ambiguous; privilege is explicit now.
-- Also allow org_admin to sync users in orgs they administer (membership).

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
  -- No JWT = service role / backend (manage-users move_user, etc.)
  IF auth.uid() IS NULL THEN
    NULL; -- privileged
  ELSIF p_user_id = auth.uid() THEN
    NULL; -- self
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
