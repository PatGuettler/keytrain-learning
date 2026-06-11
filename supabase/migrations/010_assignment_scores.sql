-- Persist course scores on assignments for dashboard display.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS last_score NUMERIC,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

DROP FUNCTION IF EXISTS record_course_attempt_result(UUID, BOOLEAN, INT);

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

  IF p_passed THEN
    UPDATE assignments
    SET
      status = 'completed',
      locked_at = NULL,
      last_score = p_score,
      completed_at = now()
    WHERE id = p_assignment_id;

    RETURN jsonb_build_object(
      'passed', true,
      'attemptsUsed', v_attempts_used,
      'maxAttempts', p_max_attempts,
      'locked', false,
      'attemptsRemaining', p_max_attempts - v_attempts_used,
      'score', p_score
    );
  END IF;

  v_new_attempts := v_attempts_used + 1;
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

-- Backfill scores from latest completed training session per assignment
UPDATE assignments a
SET
  last_score = s.score,
  completed_at = s.completed_at
FROM (
  SELECT DISTINCT ON (assignment_id)
    assignment_id,
    score,
    completed_at
  FROM training_sessions
  WHERE completed_at IS NOT NULL AND score IS NOT NULL
  ORDER BY assignment_id, completed_at DESC
) s
WHERE a.id = s.assignment_id
  AND a.status = 'completed'
  AND a.last_score IS NULL;
