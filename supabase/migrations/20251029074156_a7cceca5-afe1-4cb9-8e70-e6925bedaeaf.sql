-- Add icon field to shifts table
ALTER TABLE public.shifts ADD COLUMN icon TEXT DEFAULT 'Sun';

-- Create announcements table for updates
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Admins can create announcements
CREATE POLICY "Admins can insert announcements"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Everyone can view announcements
CREATE POLICY "Everyone can view announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (true);

-- Admins can update announcements
CREATE POLICY "Admins can update announcements"
ON public.announcements
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete announcements
CREATE POLICY "Admins can delete announcements"
ON public.announcements
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create announcements_read table to track which users have read announcements
CREATE TABLE public.announcements_read (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS on announcements_read
ALTER TABLE public.announcements_read ENABLE ROW LEVEL SECURITY;

-- Users can mark announcements as read
CREATE POLICY "Users can insert own read status"
ON public.announcements_read
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view own read status
CREATE POLICY "Users can view own read status"
ON public.announcements_read
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add trigger for announcements updated_at
ALTER TABLE public.announcements ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;

CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();