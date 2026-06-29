-- Public bucket for course lesson images (admin upload, public read).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-images',
  'course-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY course_images_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'course-images');

CREATE POLICY course_images_admin_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'course-images' AND auth_user_role() = 'admin');

CREATE POLICY course_images_admin_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'course-images' AND auth_user_role() = 'admin');

CREATE POLICY course_images_admin_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'course-images' AND auth_user_role() = 'admin');
