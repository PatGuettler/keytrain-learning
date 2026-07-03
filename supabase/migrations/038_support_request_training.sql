-- Allow "Request training" contact form category.

ALTER TABLE support_requests DROP CONSTRAINT IF EXISTS support_requests_category_check;

ALTER TABLE support_requests
  ADD CONSTRAINT support_requests_category_check CHECK (
    category IN ('bug', 'feature', 'question', 'other', 'training_request')
  );
