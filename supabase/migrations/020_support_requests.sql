-- User support / feedback submissions (email sent via edge function when configured).

CREATE TABLE support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'question', 'other')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  user_snapshot JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_requests_insert_own ON support_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY support_requests_admin_select ON support_requests FOR SELECT
  USING (auth_user_role() = 'admin');
