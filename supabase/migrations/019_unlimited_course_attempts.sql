-- max_attempts = 0 means unlimited attempts (no lockout).

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_max_attempts_check;
ALTER TABLE courses
  ALTER COLUMN max_attempts SET DEFAULT 3;
ALTER TABLE courses
  ADD CONSTRAINT courses_max_attempts_check CHECK (max_attempts >= 0);

CREATE OR REPLACE FUNCTION unlock_assignments_for_unlimited_course(p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE assignments
  SET
    locked_at = NULL,
    force_retake = false
  WHERE course_id = p_course_id
    AND locked_at IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION on_course_max_attempts_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.max_attempts = 0 AND (OLD.max_attempts IS DISTINCT FROM NEW.max_attempts) THEN
    PERFORM unlock_assignments_for_unlimited_course(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_max_attempts_unlock ON courses;
CREATE TRIGGER course_max_attempts_unlock
  AFTER UPDATE OF max_attempts ON courses
  FOR EACH ROW
  EXECUTE FUNCTION on_course_max_attempts_change();

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
  v_unlimited BOOLEAN;
BEGIN
  v_unlimited := COALESCE(p_max_attempts, 0) = 0;

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

  IF v_locked_at IS NOT NULL AND NOT v_unlimited THEN
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
      'attemptsRemaining', CASE WHEN v_unlimited THEN -1 ELSE GREATEST(0, p_max_attempts - v_new_attempts) END,
      'score', p_score
    );
  END IF;

  v_locked := NOT v_unlimited AND v_new_attempts >= p_max_attempts;

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
    'attemptsRemaining', CASE WHEN v_unlimited THEN -1 ELSE GREATEST(0, p_max_attempts - v_new_attempts) END,
    'score', p_score
  );
END;
$$;

GRANT EXECUTE ON FUNCTION record_course_attempt_result(UUID, BOOLEAN, INT, NUMERIC) TO authenticated;
