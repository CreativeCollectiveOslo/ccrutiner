-- Remove temp_password column from profiles table for security
-- Passwords are now only shown once to admin and never stored in database
ALTER TABLE public.profiles DROP COLUMN IF EXISTS temp_password;