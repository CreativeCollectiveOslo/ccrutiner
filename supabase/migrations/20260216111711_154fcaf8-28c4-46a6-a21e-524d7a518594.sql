
-- Create public storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true);

-- RLS: Everyone can view files in attachments bucket
CREATE POLICY "Anyone can view attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

-- RLS: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);

-- RLS: Users can update their own files, admins can update all
CREATE POLICY "Users can update own attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'attachments' AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin')));

-- RLS: Users can delete their own files, admins can delete all
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'attachments' AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin')));

-- Add image_url to announcements
ALTER TABLE public.announcements ADD COLUMN image_url TEXT;

-- Add image_url to bulletin_posts
ALTER TABLE public.bulletin_posts ADD COLUMN image_url TEXT;
