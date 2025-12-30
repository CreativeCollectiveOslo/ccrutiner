-- Create table for routine notifications
CREATE TABLE public.routine_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table to track which users have read which notifications
CREATE TABLE public.routine_notifications_read (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id uuid NOT NULL REFERENCES public.routine_notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Enable RLS
ALTER TABLE public.routine_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_notifications_read ENABLE ROW LEVEL SECURITY;

-- RLS policies for routine_notifications
CREATE POLICY "Admins can insert routine notifications"
ON public.routine_notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete routine notifications"
ON public.routine_notifications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view routine notifications"
ON public.routine_notifications
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS policies for routine_notifications_read
CREATE POLICY "Users can insert own read status"
ON public.routine_notifications_read
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own read status"
ON public.routine_notifications_read
FOR SELECT
USING (auth.uid() = user_id);