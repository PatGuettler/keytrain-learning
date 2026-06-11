-- Employees must be able to update their own assignment on course finish.
-- (Managers/admins already have assignments_update_manager from 001.)

CREATE POLICY assignments_update_own ON assignments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
