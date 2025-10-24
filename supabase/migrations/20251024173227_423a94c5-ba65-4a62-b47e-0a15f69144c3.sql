-- Create storage bucket for medication images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medication-images', 'medication-images', true);

-- Add image_url column to medications table
ALTER TABLE public.medications 
ADD COLUMN image_url TEXT;

-- Create storage policies for medication images
CREATE POLICY "Medication images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'medication-images');

CREATE POLICY "Users can upload their own medication images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'medication-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own medication images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'medication-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own medication images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'medication-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);