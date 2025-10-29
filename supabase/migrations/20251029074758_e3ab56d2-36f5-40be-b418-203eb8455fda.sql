-- Drop the existing policy
DROP POLICY IF EXISTS "Everyone can view announcements" ON public.announcements;

-- Create new policy that requires authentication
CREATE POLICY "Authenticated users can view announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);