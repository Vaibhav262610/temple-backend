-- Fix cms_pujas table - Add missing storage_path column
-- Run this SQL in your Supabase Dashboard SQL Editor

-- Add missing column
ALTER TABLE cms_pujas ADD COLUMN IF NOT EXISTS storage_path VARCHAR(500);

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cms_pujas'
ORDER BY ordinal_position;
