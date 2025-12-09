-- Fix puja_series table schema
-- Run this SQL in your Supabase Dashboard SQL Editor

-- Add missing columns to puja_series table
ALTER TABLE puja_series ADD COLUMN IF NOT EXISTS deity VARCHAR(255);
ALTER TABLE puja_series ADD COLUMN IF NOT EXISTS priest VARCHAR(255);
ALTER TABLE puja_series ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;
ALTER TABLE puja_series ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE puja_series ADD COLUMN IF NOT EXISTS schedule_config JSONB DEFAULT '{}';
ALTER TABLE puja_series ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE puja_series ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'puja_series'
ORDER BY ordinal_position;
