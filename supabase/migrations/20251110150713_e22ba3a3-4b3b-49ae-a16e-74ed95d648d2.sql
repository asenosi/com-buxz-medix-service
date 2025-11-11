-- Add support for multiple images per medication
-- First, add the new column for multiple images
ALTER TABLE medications ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing single image_url to image_urls array
UPDATE medications 
SET image_urls = CASE 
  WHEN image_url IS NOT NULL AND image_url != '' THEN ARRAY[image_url]
  ELSE ARRAY[]::TEXT[]
END
WHERE image_urls = ARRAY[]::TEXT[] OR image_urls IS NULL;

-- Add index for better performance when querying images
CREATE INDEX IF NOT EXISTS idx_medications_image_urls ON medications USING GIN(image_urls);

-- We'll keep the old image_url column for backward compatibility for now
-- but prioritize image_urls in the application code