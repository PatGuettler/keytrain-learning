-- Admin-managed training tags (many-to-many with courses and organizations).

CREATE TABLE training_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX training_tags_name_lower_idx ON training_tags (lower(trim(name)));

CREATE TABLE course_training_tags (
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES training_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, tag_id)
);

CREATE TABLE organization_training_tags (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES training_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (org_id, tag_id)
);

CREATE INDEX course_training_tags_tag_id_idx ON course_training_tags (tag_id);
CREATE INDEX organization_training_tags_tag_id_idx ON organization_training_tags (tag_id);

-- Seed default industry tags (matches prior enum labels).
INSERT INTO training_tags (name) VALUES
  ('Healthcare'),
  ('General'),
  ('Finance & banking'),
  ('Manufacturing'),
  ('Retail'),
  ('Technology'),
  ('Government'),
  ('Education'),
  ('Other');

-- Migrate single course category → tag links.
INSERT INTO course_training_tags (course_id, tag_id)
SELECT c.id, t.id
FROM courses c
JOIN training_tags t ON lower(trim(t.name)) = CASE c.training_category
  WHEN 'healthcare' THEN 'healthcare'
  WHEN 'general' THEN 'general'
  WHEN 'finance' THEN 'finance & banking'
  WHEN 'manufacturing' THEN 'manufacturing'
  WHEN 'retail' THEN 'retail'
  WHEN 'technology' THEN 'technology'
  WHEN 'government' THEN 'government'
  WHEN 'education' THEN 'education'
  WHEN 'other' THEN 'other'
  ELSE 'healthcare'
END
ON CONFLICT DO NOTHING;

-- Migrate organization industry → tag links.
INSERT INTO organization_training_tags (org_id, tag_id)
SELECT o.id, t.id
FROM organizations o
JOIN training_tags t ON lower(trim(t.name)) = CASE o.industry
  WHEN 'healthcare' THEN 'healthcare'
  WHEN 'general' THEN 'general'
  WHEN 'finance' THEN 'finance & banking'
  WHEN 'manufacturing' THEN 'manufacturing'
  WHEN 'retail' THEN 'retail'
  WHEN 'technology' THEN 'technology'
  WHEN 'government' THEN 'government'
  WHEN 'education' THEN 'education'
  WHEN 'other' THEN 'other'
  ELSE 'healthcare'
END
ON CONFLICT DO NOTHING;

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_training_category_check;
ALTER TABLE courses DROP COLUMN IF EXISTS training_category;

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_industry_check;
ALTER TABLE organizations DROP COLUMN IF EXISTS industry;

ALTER TABLE training_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_training_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_training_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY training_tags_select ON training_tags
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY training_tags_admin ON training_tags
  FOR ALL
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY course_training_tags_select ON course_training_tags
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY course_training_tags_admin ON course_training_tags
  FOR ALL
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY organization_training_tags_select ON organization_training_tags
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY organization_training_tags_admin ON organization_training_tags
  FOR ALL
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

COMMENT ON TABLE training_tags IS 'Admin-managed labels for filtering and assigning training by industry or topic.';
COMMENT ON TABLE course_training_tags IS 'Many-to-many: courses can have multiple training tags.';
COMMENT ON TABLE organization_training_tags IS 'Many-to-many: organizations can have multiple industry tags.';
