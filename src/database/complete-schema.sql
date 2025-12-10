-- =====================================================
-- TEMPLE STEWARD DATABASE SCHEMA
-- Complete Schema for All Active Tables
-- Last Updated: December 2024
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS & AUTHENTICATION
-- =====================================================

-- Users Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'member',
    status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
    metadata JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{"notifications": {"push": true, "email": true}}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_status ON public.users(status);

-- =====================================================
-- 2. COMMUNITIES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    logo_url TEXT,
    cover_image_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    settings JSONB DEFAULT '{"public_visible": true}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_communities_slug ON public.communities(slug);
CREATE INDEX idx_communities_status ON public.communities(status);

-- Community Members
CREATE TABLE IF NOT EXISTS public.community_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('lead', 'member')),
    status TEXT DEFAULT 'active',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(community_id, user_id)
);

CREATE INDEX idx_community_members_community ON public.community_members(community_id);
CREATE INDEX idx_community_members_user ON public.community_members(user_id);

-- Community Applications
CREATE TABLE IF NOT EXISTS public.community_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    applicant_phone TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    message TEXT,
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_applications_community ON public.community_applications(community_id);
CREATE INDEX idx_community_applications_status ON public.community_applications(status);

-- =====================================================
-- 3. EVENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    image_url TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'community', 'private')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
    capacity INTEGER,
    registration_required BOOLEAN DEFAULT false,
    is_recurring BOOLEAN DEFAULT false,
    recurring_pattern TEXT CHECK (recurring_pattern IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX idx_events_community ON public.events(community_id);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_starts_at ON public.events(starts_at);
CREATE INDEX idx_events_visibility ON public.events(visibility);

-- Community Events (alternative events table)
CREATE TABLE IF NOT EXISTS public.community_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    status TEXT DEFAULT 'scheduled',
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_events_community ON public.community_events(community_id);
CREATE INDEX idx_community_events_date ON public.community_events(event_date);

-- =====================================================
-- 4. TASKS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.community_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'completed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMPTZ,
    assigned_to UUID[],
    tags TEXT[],
    created_by UUID REFERENCES public.users(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_tasks_community ON public.community_tasks(community_id);
CREATE INDEX idx_community_tasks_status ON public.community_tasks(status);

-- =====================================================
-- 5. PRIESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.priests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialization TEXT,
    experience_years INTEGER,
    qualification TEXT,
    address TEXT,
    date_of_birth DATE,
    joining_date DATE,
    image_url TEXT,
    storage_path TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_priests_status ON public.priests(status);
CREATE INDEX idx_priests_name ON public.priests(name);

-- =====================================================
-- 6. PRIEST BOOKINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.priest_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    service_type TEXT NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time TEXT,
    address TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    priest_id UUID REFERENCES public.priests(id) ON DELETE SET NULL,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_priest_bookings_status ON public.priest_bookings(status);
CREATE INDEX idx_priest_bookings_date ON public.priest_bookings(preferred_date);
CREATE INDEX idx_priest_bookings_priest ON public.priest_bookings(priest_id);

-- =====================================================
-- 7. PUJA SERIES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.puja_series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'regular',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    start_date DATE NOT NULL,
    end_date DATE,
    schedule_config JSONB DEFAULT '{}',
    duration_minutes INTEGER DEFAULT 60,
    max_participants INTEGER,
    registration_required BOOLEAN DEFAULT false,
    priest TEXT,
    location TEXT,
    requirements TEXT[],
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_puja_series_status ON public.puja_series(status);
CREATE INDEX idx_puja_series_start_date ON public.puja_series(start_date);


-- =====================================================
-- 8. VOLUNTEERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.volunteers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    skills TEXT[],
    availability JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_volunteers_status ON public.volunteers(status);
CREATE INDEX idx_volunteers_email ON public.volunteers(email);

-- Volunteer Shifts
CREATE TABLE IF NOT EXISTS public.volunteer_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location TEXT,
    max_volunteers INTEGER DEFAULT 5,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled', 'completed')),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_volunteer_shifts_date ON public.volunteer_shifts(shift_date);
CREATE INDEX idx_volunteer_shifts_status ON public.volunteer_shifts(status);

-- Volunteer Attendance
CREATE TABLE IF NOT EXISTS public.volunteer_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    volunteer_id UUID REFERENCES public.volunteers(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.volunteer_shifts(id) ON DELETE CASCADE,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    hours_worked NUMERIC(5,2),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checked_in', 'checked_out', 'no_show')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_volunteer_attendance_volunteer ON public.volunteer_attendance(volunteer_id);
CREATE INDEX idx_volunteer_attendance_shift ON public.volunteer_attendance(shift_id);

-- Volunteer Applications
CREATE TABLE IF NOT EXISTS public.volunteer_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    skills TEXT[],
    availability JSONB DEFAULT '{}',
    motivation TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_volunteer_applications_status ON public.volunteer_applications(status);

-- =====================================================
-- 9. FINANCE - DONATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_name TEXT,
    donor_email TEXT,
    donor_phone TEXT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'INR',
    donation_type TEXT DEFAULT 'general',
    payment_method TEXT DEFAULT 'cash',
    purpose TEXT,
    receipt_number TEXT UNIQUE,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_donations_status ON public.donations(status);
CREATE INDEX idx_donations_created_at ON public.donations(created_at);
CREATE INDEX idx_donations_type ON public.donations(donation_type);

-- Donation Categories
CREATE TABLE IF NOT EXISTS public.donation_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. FINANCE - EXPENSES & TRANSACTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    vendor_name TEXT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    expense_date DATE NOT NULL,
    payment_method TEXT,
    receipt_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_status ON public.expenses(status);

-- Budget Categories
CREATE TABLE IF NOT EXISTS public.budget_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category_type TEXT DEFAULT 'expense' CHECK (category_type IN ('income', 'expense')),
    budget_amount NUMERIC(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial Transactions
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.budget_categories(id),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    transaction_date DATE DEFAULT CURRENT_DATE,
    payment_method TEXT,
    reference_number TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_financial_transactions_type ON public.financial_transactions(type);
CREATE INDEX idx_financial_transactions_date ON public.financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_category ON public.financial_transactions(category_id);

-- =====================================================
-- 11. CMS - WEBSITE CONTENT MANAGEMENT
-- =====================================================

-- CMS Banner
CREATE TABLE IF NOT EXISTS public.cms_banner (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    description TEXT,
    link_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CMS About
CREATE TABLE IF NOT EXISTS public.cms_about (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CMS Images (for banners, gallery, broadcast)
CREATE TABLE IF NOT EXISTS public.cms_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    title TEXT,
    description TEXT,
    image_url TEXT NOT NULL,
    storage_path TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_images_name ON public.cms_images(name);
CREATE INDEX idx_cms_images_active ON public.cms_images(is_active);

-- CMS Contact Form Submissions
CREATE TABLE IF NOT EXISTS public.cms_contact (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
    is_read BOOLEAN DEFAULT false,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_contact_status ON public.cms_contact(status);
CREATE INDEX idx_cms_contact_is_read ON public.cms_contact(is_read);

-- CMS Pujas (for website display)
CREATE TABLE IF NOT EXISTS public.cms_pujas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    storage_path TEXT,
    schedule TEXT,
    priest_name TEXT,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_pujas_active ON public.cms_pujas(is_active);

-- CMS Sai Aangan
CREATE TABLE IF NOT EXISTS public.cms_sai_aangan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_sai_aangan_active ON public.cms_sai_aangan(is_active);

-- CMS Upcoming Events
CREATE TABLE IF NOT EXISTS public.cms_upcoming_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TEXT,
    location TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_upcoming_events_date ON public.cms_upcoming_events(event_date);
CREATE INDEX idx_cms_upcoming_events_active ON public.cms_upcoming_events(is_active);

-- CMS Mandir Hours
CREATE TABLE IF NOT EXISTS public.cms_mandir_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_type TEXT NOT NULL,
    title TEXT,
    description TEXT,
    timings JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_mandir_hours_active ON public.cms_mandir_hours(is_active);

-- CMS Bal Vidya Mandir
CREATE TABLE IF NOT EXISTS public.cms_bal_vidya_mandir (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL DEFAULT 'Bal Vidya Mandir',
    subtitle TEXT DEFAULT 'Discipline, Devotion, Development of Character',
    quote TEXT,
    why_bvm_title TEXT DEFAULT 'Why Bala Vidya Mandir?',
    why_bvm_content TEXT,
    who_teaches_title TEXT DEFAULT 'Who will teach?',
    who_teaches_content TEXT,
    who_can_join_title TEXT DEFAULT 'Who can join?',
    who_can_join_content TEXT,
    schedule_title TEXT DEFAULT 'When and where do these classes meet?',
    schedule_items JSONB DEFAULT '[]',
    location TEXT,
    syllabus_url TEXT,
    parent_guidelines_url TEXT,
    registration_status TEXT DEFAULT 'closed' CHECK (registration_status IN ('open', 'closed', 'coming_soon')),
    registration_message TEXT,
    registration_link TEXT,
    contact_email TEXT DEFAULT 'bvm@saisamsthanusa.org',
    contact_phone TEXT DEFAULT '(630) 897-1500',
    class_day TEXT DEFAULT 'Every Sunday',
    class_time TEXT DEFAULT '10:30 AM - 12:30 PM',
    min_age TEXT DEFAULT '5 years and above',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_bal_vidya_active ON public.cms_bal_vidya_mandir(is_active);

-- =====================================================
-- 12. BROADCASTS & COMMUNICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    channel TEXT DEFAULT 'all' CHECK (channel IN ('all', 'email', 'sms', 'push')),
    audience TEXT DEFAULT 'all',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    recipient_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_broadcasts_status ON public.broadcasts(status);

-- Communication Templates
CREATE TABLE IF NOT EXISTS public.communication_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'push')),
    subject TEXT,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    category TEXT DEFAULT 'general',
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_communication_templates_type ON public.communication_templates(type);
CREATE INDEX idx_communication_templates_active ON public.communication_templates(is_active);

-- =====================================================
-- 13. GALLERY
-- =====================================================

CREATE TABLE IF NOT EXISTS public.gallery_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    description TEXT,
    image_url TEXT NOT NULL,
    storage_path TEXT,
    category TEXT DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    uploaded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gallery_images_category ON public.gallery_images(category);
CREATE INDEX idx_gallery_images_active ON public.gallery_images(is_active);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priest_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puja_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_pujas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_bal_vidya_mandir ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- Public read access for CMS tables
CREATE POLICY "Public read access" ON public.cms_images FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.cms_pujas FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.cms_sai_aangan FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.cms_upcoming_events FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.cms_mandir_hours FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.cms_bal_vidya_mandir FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.events FOR SELECT USING (visibility = 'public');

-- Authenticated users can manage content
CREATE POLICY "Authenticated users full access" ON public.cms_images FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON public.cms_pujas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON public.priests FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON public.priest_bookings FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- 14. BUDGETS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    budgeted_amount NUMERIC(12,2) NOT NULL CHECK (budgeted_amount >= 0),
    spent_amount NUMERIC(12,2) DEFAULT 0 CHECK (spent_amount >= 0),
    period TEXT DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    description TEXT,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    documents JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budgets_category ON public.budgets(category);
CREATE INDEX idx_budgets_period ON public.budgets(period);
CREATE INDEX idx_budgets_active ON public.budgets(is_active);

-- Budget Requests (for community budget requests)
CREATE TABLE IF NOT EXISTS public.budget_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
    budget_amount NUMERIC(12,2) NOT NULL CHECK (budget_amount > 0),
    purpose TEXT NOT NULL,
    event_name TEXT,
    documents JSONB DEFAULT '[]',
    requested_by UUID REFERENCES public.users(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES public.users(id),
    rejected_by UUID REFERENCES public.users(id),
    approved_amount NUMERIC(12,2),
    approval_notes TEXT,
    rejection_reason TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_requests_community ON public.budget_requests(community_id);
CREATE INDEX idx_budget_requests_status ON public.budget_requests(status);
CREATE INDEX idx_budget_requests_created_at ON public.budget_requests(created_at);

-- Enable RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_requests ENABLE ROW LEVEL SECURITY;

-- Policies for budgets
CREATE POLICY "Authenticated users full access" ON public.budgets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON public.budget_requests FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- END OF SCHEMA
-- =====================================================
