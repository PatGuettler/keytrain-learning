-- Fix course-images storage uploads: auth helpers must use public search_path in storage RLS context.

CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-images',
  'course-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS course_images_public_read ON storage.objects;
DROP POLICY IF EXISTS course_images_admin_insert ON storage.objects;
DROP POLICY IF EXISTS course_images_admin_update ON storage.objects;
DROP POLICY IF EXISTS course_images_admin_delete ON storage.objects;

CREATE POLICY course_images_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'course-images');

CREATE POLICY course_images_admin_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY course_images_admin_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'course-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY course_images_admin_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
