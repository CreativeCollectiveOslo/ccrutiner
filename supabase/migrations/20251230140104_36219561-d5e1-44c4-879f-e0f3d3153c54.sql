-- Allow admins to view all read statuses for announcements
CREATE POLICY "Admins can view all announcement read statuses"
ON public.announcements_read
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all read statuses for routine notifications
CREATE POLICY "Admins can view all routine notification read statuses"
ON public.routine_notifications_read
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));