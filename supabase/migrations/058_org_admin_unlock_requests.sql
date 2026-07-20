-- Org admins may approve/deny unlock requests for users in organizations they administer.

CREATE OR REPLACE FUNCTION approve_course_unlock(p_request_id uuid, p_admin_id uuid, p_approved boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request course_unlock_requests%ROWTYPE;
  v_role user_role;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Not allowed.';
  END IF;

  v_role := auth_user_role();

  SELECT * INTO v_request
  FROM course_unlock_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unlock request not found.';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Request already resolved.';
  END IF;

  IF v_role = 'admin' THEN
    NULL;
  ELSIF v_role = 'org_admin' AND auth_is_org_admin_of(v_request.org_id) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Not allowed.';
  END IF;

  UPDATE course_unlock_requests
  SET
    status = CASE WHEN p_approved THEN 'approved' ELSE 'denied' END,
    resolved_at = now(),
    resolved_by = p_admin_id
  WHERE id = p_request_id;

  IF p_approved THEN
    UPDATE assignments
    SET
      locked_at = NULL,
      attempts_used = 0,
      status = 'in_progress',
      force_retake = true,
      last_score = NULL,
      completed_at = NULL
    WHERE id = v_request.assignment_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_course_unlock(uuid, uuid, boolean) TO authenticated;

-- Org admins can read unlock requests for their organizations.
DROP POLICY IF EXISTS unlock_requests_org_admin_select ON course_unlock_requests;
CREATE POLICY unlock_requests_org_admin_select ON course_unlock_requests FOR SELECT
  USING (
    auth_user_role() = 'org_admin'
    AND auth_is_org_admin_of(org_id)
  );
