-- Rename hive_* columns to railnet_* (RailNet rebrand). Idempotent for fresh installs.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'hive_org_id'
  ) THEN
    ALTER TABLE organizations RENAME COLUMN hive_org_id TO railnet_org_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'compliance_documents' AND column_name = 'hive_org_id'
  ) THEN
    ALTER TABLE compliance_documents RENAME COLUMN hive_org_id TO railnet_org_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'compliance_documents_hive_org_idx'
  ) THEN
    ALTER INDEX compliance_documents_hive_org_idx RENAME TO compliance_documents_railnet_org_idx;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'course_staging' AND column_name = 'hive_org_id'
  ) THEN
    ALTER TABLE course_staging RENAME COLUMN hive_org_id TO railnet_org_id;
  END IF;
END $$;
