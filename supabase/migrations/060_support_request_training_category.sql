-- Ensure "Request training" category is allowed (038 may not have been applied on prod).

ALTER TABLE support_requests DROP CONSTRAINT IF EXISTS support_requests_category_check;

ALTER TABLE support_requests
  ADD CONSTRAINT support_requests_category_check CHECK (
    category IN ('bug', 'feature', 'question', 'other', 'training_request')
  );
