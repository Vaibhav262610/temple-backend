-- Create priests table for storing priest information
-- Run this SQL in your Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS priests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    specialization VARCHAR(255),
    experience_years INTEGER,
    qualification VARCHAR(255),
    address TEXT,
    date_of_birth DATE,
    joining_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    image_url TEXT,
    storage_path VARCHAR(500),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_priests_status ON priests(status);
CREATE INDEX IF NOT EXISTS idx_priests_name ON priests(name);
CREATE INDEX IF NOT EXISTS idx_priests_created_at ON priests(created_at DESC);

-- Enable Row Level Security (optional - disable if causing issues)
-- ALTER TABLE priests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read priests
-- CREATE POLICY "Allow authenticated users to read priests" ON priests
--     FOR SELECT TO authenticated USING (true);

-- Create policy to allow admins to manage priests
-- CREATE POLICY "Allow admins to manage priests" ON priests
--     FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- If you encounter RLS issues, run this instead:
ALTER TABLE priests DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON priests TO authenticated;
GRANT ALL ON priests TO service_role;

-- Add comment to table
COMMENT ON TABLE priests IS 'Stores temple priest information including their profile, qualifications, and images';
