-- Phishing template admin write access + course/org industry categorization.

DROP POLICY IF EXISTS phishing_templates_admin_select ON phishing_templates;
CREATE POLICY phishing_templates_admin_all ON phishing_templates
  FOR ALL
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS training_category TEXT NOT NULL DEFAULT 'healthcare';

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_training_category_check;
ALTER TABLE courses
  ADD CONSTRAINT courses_training_category_check CHECK (
    training_category IN (
      'healthcare',
      'general',
      'finance',
      'manufacturing',
      'retail',
      'technology',
      'government',
      'education',
      'other'
    )
  );

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS industry TEXT NOT NULL DEFAULT 'healthcare';

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_industry_check;
ALTER TABLE organizations
  ADD CONSTRAINT organizations_industry_check CHECK (
    industry IN (
      'healthcare',
      'general',
      'finance',
      'manufacturing',
      'retail',
      'technology',
      'government',
      'education',
      'other'
    )
  );

COMMENT ON COLUMN courses.training_category IS 'Industry tag for filtering and bulk assignment.';
COMMENT ON COLUMN organizations.industry IS 'Client industry — used to suggest matching training courses.';
