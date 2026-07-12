-- Additive only: append org_admin to user_role. Existing rows unchanged.
-- Must be a separate migration from policies that reference org_admin
-- (Postgres cannot use a newly added enum value until the adding transaction commits).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'org_admin'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'org_admin';
  END IF;
END $$;
