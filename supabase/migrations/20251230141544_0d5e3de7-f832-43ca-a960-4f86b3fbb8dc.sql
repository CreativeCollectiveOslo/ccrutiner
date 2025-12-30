-- Add created_by column to routine_notifications
ALTER TABLE public.routine_notifications 
ADD COLUMN created_by uuid REFERENCES auth.users(id);