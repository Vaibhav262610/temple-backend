-- Create tables for Website CMS: Sai Aangan, Upcoming Events, Mandir Hours
-- Run this SQL in your Supabase Dashboard SQL Editor

-- =============================================
-- 1. SAI AANGAN (Mandir Expansion Projects)
-- =============================================
CREATE TABLE IF NOT EXISTS cms_sai_aangan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    timeline_updates JSONB DEFAULT '[]',  -- Array of {date, update_text}
    donation_link TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. UPCOMING EVENTS
-- =============================================
CREATE TABLE IF NOT EXISTS cms_upcoming_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    day_of_week VARCHAR(20),
    time_details TEXT,
    description TEXT,
    details_link TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. MANDIR HOURS & AARTI TIMES
-- =============================================
CREATE TABLE IF NOT EXISTS cms_mandir_hours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    section_type VARCHAR(50) NOT NULL,  -- 'hours' or 'aarti'
    title VARCHAR(255),
    description TEXT,
    timings JSONB DEFAULT '[]',  -- Array of {label, time, note}
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for all tables
ALTER TABLE cms_sai_aangan DISABLE ROW LEVEL SECURITY;
ALTER TABLE cms_upcoming_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE cms_mandir_hours DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON cms_sai_aangan TO authenticated;
GRANT ALL ON cms_sai_aangan TO service_role;
GRANT SELECT ON cms_sai_aangan TO anon;

GRANT ALL ON cms_upcoming_events TO authenticated;
GRANT ALL ON cms_upcoming_events TO service_role;
GRANT SELECT ON cms_upcoming_events TO anon;

GRANT ALL ON cms_mandir_hours TO authenticated;
GRANT ALL ON cms_mandir_hours TO service_role;
GRANT SELECT ON cms_mandir_hours TO anon;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cms_sai_aangan_active ON cms_sai_aangan(is_active);
CREATE INDEX IF NOT EXISTS idx_cms_upcoming_events_date ON cms_upcoming_events(event_date);
CREATE INDEX IF NOT EXISTS idx_cms_mandir_hours_type ON cms_mandir_hours(section_type);
