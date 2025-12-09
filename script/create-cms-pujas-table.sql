-- Create cms_pujas table for storing puja information
-- Run this SQL in your Supabase Dashboard SQL Editor

-- Drop existing table if needed (uncomment if you want to recreate)
-- DROP TABLE IF EXISTS cms_pujas;

CREATE TABLE IF NOT EXISTS cms_pujas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    short_description TEXT,
    image_url TEXT,
    storage_path VARCHAR(500),
    price DECIMAL(10, 2) DEFAULT 0,
    price_display VARCHAR(100),
    duration VARCHAR(100),
    location VARCHAR(255),
    priest_name VARCHAR(255),
    category VARCHAR(100) DEFAULT 'General Puja',
    benefits JSONB DEFAULT '[]',
    items_included JSONB DEFAULT '[]',
    booking_required BOOLEAN DEFAULT false,
    advance_booking_days INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_cms_pujas_is_active ON cms_pujas(is_active);
CREATE INDEX IF NOT EXISTS idx_cms_pujas_category ON cms_pujas(category);
CREATE INDEX IF NOT EXISTS idx_cms_pujas_display_order ON cms_pujas(display_order);
CREATE INDEX IF NOT EXISTS idx_cms_pujas_is_featured ON cms_pujas(is_featured);

-- Disable Row Level Security (to avoid permission issues)
ALTER TABLE cms_pujas DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON cms_pujas TO authenticated;
GRANT ALL ON cms_pujas TO service_role;
GRANT SELECT ON cms_pujas TO anon;

-- Add comment to table
COMMENT ON TABLE cms_pujas IS 'Stores temple puja information for CMS display including pricing, images, and booking settings';

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cms_pujas'
ORDER BY ordinal_position;
