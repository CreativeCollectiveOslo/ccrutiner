ALTER POLICY "Authenticated users can upload attachments" ON storage.objects TO authenticated;
ALTER POLICY "Users can delete own attachments" ON storage.objects TO authenticated;
ALTER POLICY "Users can update own attachments" ON storage.objects TO authenticated;