-- Course setting: learners may view pass/fail results after completing an attempt.
-- Admin RPC: assign another course attempt without an unlock request.

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS show_results_after_completion BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION admin_assign_course_retake(p_assignment_id UUID, p_admin_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth_user_role() <> 'admin' OR auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Not allowed.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM assignments WHERE id = p_assignment_id) THEN
    RAISE EXCEPTION 'Assignment not found.';
  END IF;

  UPDATE assignments
  SET
    locked_at = NULL,
    status = 'in_progress',
    force_retake = true,
    last_score = NULL,
    completed_at = NULL
  WHERE id = p_assignment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_assign_course_retake(UUID, UUID) TO authenticated;
