-- Daily Bible verse preferences + anonymous prayer requests.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS daily_verse_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE daily_verse_dismissals (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, local_date)
);

ALTER TABLE daily_verse_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_verse_dismissals_select_own ON daily_verse_dismissals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY daily_verse_dismissals_insert_own ON daily_verse_dismissals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE TABLE prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL CHECK (char_length(trim(message)) >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY prayer_requests_admin_select ON prayer_requests FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY prayer_requests_admin_delete ON prayer_requests FOR DELETE
  USING (auth_user_role() = 'admin');

CREATE TABLE prayer_request_prayers (
  request_id UUID NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prayed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, admin_id)
);

ALTER TABLE prayer_request_prayers ENABLE ROW LEVEL SECURITY;

CREATE POLICY prayer_request_prayers_admin_select ON prayer_request_prayers FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY prayer_request_prayers_admin_insert ON prayer_request_prayers FOR INSERT
  WITH CHECK (auth_user_role() = 'admin' AND admin_id = auth.uid());
