-- Add bulk_images column to blogs table
ALTER TABLE blogs 
ADD COLUMN IF NOT EXISTS bulk_images JSONB DEFAULT '[]'::jsonb;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_blogs_bulk_images ON blogs USING GIN (bulk_images);

-- Add comment
COMMENT ON COLUMN blogs.bulk_images IS 'Array of bulk uploaded image URLs for use in content editor';
