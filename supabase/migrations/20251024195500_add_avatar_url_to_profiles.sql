-- Add avatar_url column to profiles for storing a public image URL
ALTER TABLE public.profiles
ADD COLUMN avatar_url TEXT;

