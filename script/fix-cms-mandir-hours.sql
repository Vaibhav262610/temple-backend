-- Fix cms_mandir_hours table to ensure timings column works correctly
-- Run this SQL in your Supabase Dashboard SQL Editor

-- Option 1: If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS cms_mandir_hours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    section_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    timings JSONB DEFAULT '[]'::jsonb,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Option 2: If table exists but timings column has issues, fix it
-- This ensures the column is JSONB type with proper default
DO $$
BEGIN
    -- Check if timings column exists and alter if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cms_mandir_hours' AND column_name = 'timings'
    ) THEN
        -- Ensure it's JSONB type
        ALTER TABLE cms_mandir_hours 
        ALTER COLUMN timings TYPE JSONB USING COALESCE(timings::jsonb, '[]'::jsonb);
        
        -- Set default
        ALTER TABLE cms_mandir_hours 
        ALTER COLUMN timings SET DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Disable RLS
ALTER TABLE cms_mandir_hours DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON cms_mandir_hours TO authenticated;
GRANT ALL ON cms_mandir_hours TO service_role;
GRANT SELECT ON cms_mandir_hours TO anon;

-- Create index
CREATE INDEX IF NOT EXISTS idx_cms_mandir_hours_type ON cms_mandir_hours(section_type);

-- Verify table structure
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'cms_mandir_hours';
