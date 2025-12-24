-- Add bulk_images column to cms_pages table
ALTER TABLE cms_pages 
ADD COLUMN IF NOT EXISTS bulk_images JSONB DEFAULT '[]'::jsonb;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cms_pages_bulk_images ON cms_pages USING GIN (bulk_images);

-- Add comment
COMMENT ON COLUMN cms_pages.bulk_images IS 'Array of bulk uploaded image URLs for use in content editor';
