-- Align LMS (KeyTrain Standard) orgs that still have legacy per-role seat fees
-- with current catalog: $60 base, 20 users included, $2.20 additional.
-- Does not touch railnet / both (Intelligence) locked terms.

UPDATE org_billing_terms
SET
  plan_base_cents = 6000,
  org_admin_cents = 0,
  manager_cents = 0,
  employee_cents = 220,
  updated_at = now()
WHERE plan = 'lms'
  AND (
    org_admin_cents <> 0
    OR manager_cents <> 0
    OR plan_base_cents <> 6000
    OR employee_cents NOT IN (220, 0)
  );
