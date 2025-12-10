-- Create cms_images table for storing banner and gallery images
-- Run this SQL in your Supabase Dashboard SQL Editor

-- =============================================
-- CMS IMAGES TABLE
-- Used for: banners (banner-1, banner-2, banner-3, banner-4), gallery images
-- =============================================
CREATE TABLE IF NOT EXISTS cms_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,  -- 'banner-1', 'banner-2', 'banner-3', 'banner-4', 'gallery'
    image_url TEXT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    storage_path TEXT,  -- Path in Supabase Storage (e.g., 'banners/banner-1-uuid.jpg')
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for the table
ALTER TABLE cms_images DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON cms_images TO authenticated;
GRANT ALL ON cms_images TO service_role;
GRANT SELECT ON cms_images TO anon;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cms_images_name ON cms_images(name);
CREATE INDEX IF NOT EXISTS idx_cms_images_active ON cms_images(is_active);

-- =============================================
-- IMPORTANT: Make sure the 'gallery-images' bucket exists in Supabase Storage
-- Go to Storage > Create new bucket > Name: 'gallery-images' > Public: Yes
-- =============================================
