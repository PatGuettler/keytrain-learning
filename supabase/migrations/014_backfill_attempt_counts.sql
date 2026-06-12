-- Ensure attempts_used reflects completed courses and scored finishes (legacy rows).

UPDATE assignments
SET attempts_used = GREATEST(attempts_used, 1)
WHERE status = 'completed'
  AND attempts_used < 1;

UPDATE assignments a
SET attempts_used = GREATEST(a.attempts_used, s.cnt)
FROM (
  SELECT assignment_id, COUNT(*)::int AS cnt
  FROM training_sessions
  WHERE completed_at IS NOT NULL
  GROUP BY assignment_id
) s
WHERE a.id = s.assignment_id
  AND a.attempts_used < s.cnt;

UPDATE assignments
SET attempts_used = GREATEST(attempts_used, 1)
WHERE last_score IS NOT NULL
  AND attempts_used < 1;
