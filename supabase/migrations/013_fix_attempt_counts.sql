-- Count every finished course run (pass or fail) toward attempts_used.
-- Backfill rows completed before attempt tracking was added.

CREATE OR REPLACE FUNCTION record_course_attempt_result(
  p_assignment_id UUID,
  p_passed BOOLEAN,
  p_max_attempts INT,
  p_score NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_attempts_used INT;
  v_locked_at TIMESTAMPTZ;
  v_new_attempts INT;
  v_locked BOOLEAN;
BEGIN
  SELECT user_id, attempts_used, locked_at
  INTO v_user_id, v_attempts_used, v_locked_at
  FROM assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found.';
  END IF;

  IF v_user_id IS DISTINCT FROM auth.uid() AND auth_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Not allowed to update this assignment.';
  END IF;

  IF v_locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Course is locked.';
  END IF;

  v_new_attempts := v_attempts_used + 1;

  IF p_passed THEN
    UPDATE assignments
    SET
      status = 'completed',
      locked_at = NULL,
      last_score = p_score,
      completed_at = now(),
      attempts_used = v_new_attempts
    WHERE id = p_assignment_id;

    RETURN jsonb_build_object(
      'passed', true,
      'attemptsUsed', v_new_attempts,
      'maxAttempts', p_max_attempts,
      'locked', false,
      'attemptsRemaining', GREATEST(0, p_max_attempts - v_new_attempts),
      'score', p_score
    );
  END IF;

  v_locked := v_new_attempts >= p_max_attempts;

  UPDATE assignments
  SET
    attempts_used = v_new_attempts,
    status = 'in_progress',
    locked_at = CASE WHEN v_locked THEN now() ELSE NULL END,
    last_score = COALESCE(p_score, last_score)
  WHERE id = p_assignment_id;

  RETURN jsonb_build_object(
    'passed', false,
    'attemptsUsed', v_new_attempts,
    'maxAttempts', p_max_attempts,
    'locked', v_locked,
    'attemptsRemaining', GREATEST(0, p_max_attempts - v_new_attempts),
    'score', p_score
  );
END;
$$;

GRANT EXECUTE ON FUNCTION record_course_attempt_result(UUID, BOOLEAN, INT, NUMERIC) TO authenticated;

-- Backfill: assignments with completed sessions but attempts_used still 0
UPDATE assignments a
SET attempts_used = s.cnt
FROM (
  SELECT assignment_id, COUNT(*)::int AS cnt
  FROM training_sessions
  WHERE completed_at IS NOT NULL
  GROUP BY assignment_id
) s
WHERE a.id = s.assignment_id
  AND a.attempts_used < s.cnt;
