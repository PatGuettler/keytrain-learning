-- All non-admin staff are auto-assigned active published courses (no manager assignment).

CREATE OR REPLACE FUNCTION sync_user_required_assignments(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_org_id UUID;
  v_role user_role;
  pub RECORD;
  v_due DATE;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Not allowed to sync assignments for another user.';
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION sync_user_required_assignments(UUID) TO authenticated;

-- Only admins create assignments directly; staff get them via publish + sync RPC.
DROP POLICY IF EXISTS assignments_insert_manager ON assignments;

CREATE POLICY assignments_insert_admin ON assignments FOR INSERT
  WITH CHECK (auth_user_role() = 'admin');
