-- Publish courses to organizations with optional take-by deadline and login notices.
-- Publications reference the live course row (course_id) — no content snapshots or version history.

CREATE TABLE course_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  available_until TIMESTAMPTZ,
  unpublished_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, org_id)
);

CREATE TABLE course_publication_acknowledgments (
  publication_id UUID NOT NULL REFERENCES course_publications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (publication_id, user_id)
);

CREATE INDEX idx_course_publications_org ON course_publications(org_id);
CREATE INDEX idx_course_publications_course ON course_publications(course_id);
CREATE INDEX idx_course_publications_active ON course_publications(org_id, unpublished_at)
  WHERE unpublished_at IS NULL;

CREATE OR REPLACE FUNCTION course_publication_is_active(
  published_at TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  unpublished_at TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
  SELECT unpublished_at IS NULL
    AND published_at <= now()
    AND (available_until IS NULL OR available_until > now());
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE course_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_publication_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_publications_admin ON course_publications FOR ALL
  USING (auth_user_role() = 'admin');

CREATE POLICY course_publications_select_org ON course_publications FOR SELECT
  USING (
    org_id = auth_org_id()
    AND course_publication_is_active(published_at, available_until, unpublished_at)
  );

CREATE POLICY course_pub_ack_own ON course_publication_acknowledgments FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY course_pub_ack_admin ON course_publication_acknowledgments FOR SELECT
  USING (auth_user_role() = 'admin');

-- Backfill active publications for courses already marked published.
INSERT INTO course_publications (course_id, org_id, published_at, published_by)
SELECT c.id, c.org_id, COALESCE(c.updated_at, c.created_at), c.created_by
FROM courses c
WHERE c.is_published = true
ON CONFLICT (course_id, org_id) DO NOTHING;
