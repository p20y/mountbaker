-- Supabase Storage bucket configuration
-- Run these commands in your Supabase SQL editor or via the Supabase dashboard

-- Create bucket for PDF uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-uploads',
  'pdf-uploads',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for generated diagrams
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diagrams',
  'diagrams',
  false, -- Private bucket
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for pdf-uploads bucket
-- Allow service role to upload/download
CREATE POLICY "Service role can manage PDF uploads"
  ON storage.objects FOR ALL
  USING (bucket_id = 'pdf-uploads' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'pdf-uploads' AND auth.role() = 'service_role');

-- Allow authenticated users to upload PDFs
CREATE POLICY "Authenticated users can upload PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pdf-uploads' AND
    auth.role() = 'authenticated'
  );

-- Allow users to read their own PDFs
CREATE POLICY "Users can read their PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pdf-uploads' AND
    (
      auth.role() = 'service_role' OR
      (auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text)
    )
  );

-- Storage policies for diagrams bucket
-- Allow service role to upload/download
CREATE POLICY "Service role can manage diagrams"
  ON storage.objects FOR ALL
  USING (bucket_id = 'diagrams' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'diagrams' AND auth.role() = 'service_role');

-- Allow authenticated users to read diagrams
CREATE POLICY "Users can read diagrams"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'diagrams' AND
    (
      auth.role() = 'service_role' OR
      (auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text)
    )
  );

