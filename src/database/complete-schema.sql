-- =====================================================
-- TEMPLE STEWARD DATABASE SCHEMA - COMPLETE
-- Based on existing schema with minor adjustments
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CUSTOM TYPES (ENUMS)
-- =====================================================

-- User status enum
CREATE TYPE user_status AS ENUM ('pending', 'active', 'inactive', 'suspended');

-- Community status enum
CREATE TYPE community_status AS ENUM ('active', 'inactive', 'archived');

-- Community member role enum
CREATE TYPE community_member_role AS ENUM ('lead', 'member');

-- Event visibility enum
CREATE TYPE event_visibility AS ENUM ('public', 'community', 'private');

-- Event status enum
CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');

-- Recurrence pattern enum
CREATE TYPE recurrence_pattern AS ENUM ('none', 'daily', 'weekly', 'monthly', 'yearly');

-- Task status enum
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');

-- Budget status enum
CREATE TYPE budget_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- Donation source enum
CREATE TYPE donation_source AS ENUM ('web_gateway', 'hundi', 'in_temple', 'bank_transfer', 'other');

-- Payment provider enum
CREATE TYPE payment_provider AS ENUM ('stripe', 'razorpay', 'manual', 'bank');

-- Donation status enum
CREATE TYPE donation_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');

-- Expense category enum
CREATE TYPE expense_category AS ENUM ('maintenance', 'utilities', 'salaries', 'materials', 'events', 'other');

-- Puja status enum
CREATE TYPE puja_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- Message channel enum
CREATE TYPE message_channel AS ENUM ('push', 'whatsapp', 'email', 'sms');

-- Message status enum
CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'cancelled');

-- Audience segment enum
CREATE TYPE audience_segment AS ENUM ('all', 'members', 'volunteers', 'donors', 'custom');

-- System role enum (for user_roles table)
CREATE TYPE system_role AS ENUM (
  'super_admin',
  'chairman',
  'board_member',
  'temple_admin',
  'community_owner',
  'community_lead',
  'member',
  'volunteer_coordinator',
  'volunteer',
  'priest',
  'finance',
  'donor'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  avatar_url text,
  status user_status DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb,
  preferences jsonb DEFAULT '{"notifications": {"push": true, "email": true, "whatsapp": true}}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_login_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- User Roles Table (modified to use system_role enum)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  role system_role NOT NULL,
  community_id uuid,
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_roles_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE,
  CONSTRAINT user_roles_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id),
  CONSTRAINT unique_user_role_community UNIQUE (user_id, role, community_id)
);

-- Communities Table
CREATE TABLE IF NOT EXISTS public.communities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  owner_id uuid NOT NULL,
  logo_url text,
  cover_image_url text,
  status community_status DEFAULT 'active',
  settings jsonb DEFAULT '{"public_visible": true, "allow_join_requests": true}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT communities_pkey PRIMARY KEY (id),
  CONSTRAINT communities_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Community Members Table
CREATE TABLE IF NOT EXISTS public.community_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  community_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role community_member_role DEFAULT 'member',
  status text DEFAULT 'active',
  joined_at timestamp with time zone DEFAULT now(),
  invited_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT community_members_pkey PRIMARY KEY (id),
  CONSTRAINT community_members_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE,
  CONSTRAINT community_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT community_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id),
  CONSTRAINT unique_community_member UNIQUE (community_id, user_id)
);

-- Activity Timeline Table
CREATE TABLE IF NOT EXISTS public.activity_timeline (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  community_id uuid,
  event_id uuid,
  actor_id uuid,
  user_id uuid,
  action text NOT NULL,
  activity_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_title text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_public boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_timeline_pkey PRIMARY KEY (id),
  CONSTRAINT activity_timeline_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE,
  CONSTRAINT activity_timeline_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT activity_timeline_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT activity_timeline_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL
);

-- Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  community_id uuid,
  title text NOT NULL,
  description text,
  location text,
  location_coords point,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  event_type text,
  recurring_pattern recurrence_pattern DEFAULT 'none',
  recurring_frequency integer DEFAULT 1,
  recurring_days_of_week integer[],
  recurring_day_of_month integer,
  recurring_week_of_month integer,
  recurring_end_date date,
  recurring_count integer,
  timezone text DEFAULT 'Asia/Kolkata',
  visibility event_visibility DEFAULT 'public',
  status event_status DEFAULT 'draft',
  capacity integer,
  registration_required boolean DEFAULT false,
  registration_deadline timestamp with time zone,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  published_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE,
  CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT events_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

-- Event Instances Table
CREATE TABLE IF NOT EXISTS public.event_instances (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  status event_status DEFAULT 'published',
  is_exception boolean DEFAULT false,
  exception_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_instances_pkey PRIMARY KEY (id),
  CONSTRAINT event_instances_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

-- Event Registrations Table (NEW - for tracking attendance)
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
  registered_at timestamp with time zone DEFAULT now(),
  attended_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT event_registrations_pkey PRIMARY KEY (id),
  CONSTRAINT event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT event_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_event_registration UNIQUE (event_id, user_id)
);

-- Tasks Table (Community & Event Tasks)
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  community_id uuid,
  event_id uuid,
  title text NOT NULL,
  description text,
  status task_status DEFAULT 'todo',
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date timestamp with time zone,
  assignees uuid[],
  completed_at timestamp with time zone,
  note text,
  attachments text[],
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE,
  CONSTRAINT tasks_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Event Tasks Table (legacy support)
CREATE TABLE IF NOT EXISTS public.event_tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL,
  event_instance_id uuid,
  title text NOT NULL,
  description text,
  assignee_id uuid,
  status task_status DEFAULT 'todo',
  priority integer DEFAULT 0,
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  note text,
  attachments text[],
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT event_tasks_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT event_tasks_event_instance_id_fkey FOREIGN KEY (event_instance_id) REFERENCES public.event_instances(id) ON DELETE CASCADE,
  CONSTRAINT event_tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id),
  CONSTRAINT event_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  community_id uuid,
  event_id uuid,
  requested_by uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  purpose text NOT NULL,
  line_items jsonb DEFAULT '[]'::jsonb,
  attachments text[],
  status budget_status DEFAULT 'draft',
  finance_reviewer_id uuid,
  finance_note text,
  reviewed_at timestamp with time zone,
  approved_amount numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT budgets_pkey PRIMARY KEY (id),
  CONSTRAINT budgets_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE,
  CONSTRAINT budgets_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT budgets_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id),
  CONSTRAINT budgets_finance_reviewer_id_fkey FOREIGN KEY (finance_reviewer_id) REFERENCES public.users(id)
);

-- Donations Table
CREATE TABLE IF NOT EXISTS public.donations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  source donation_source NOT NULL,
  provider payment_provider,
  provider_payment_id text,
  provider_customer_id text,
  provider_session_id text,
  provider_charge_id text,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text DEFAULT 'INR',
  provider_fee_amount numeric DEFAULT 0,
  net_amount numeric GENERATED ALWAYS AS (amount - COALESCE(provider_fee_amount, 0)) STORED,
  community_id uuid,
  event_id uuid,
  puja_id uuid,
  donor_name text,
  donor_email text,
  donor_phone text,
  donor_pan text,
  donor_address jsonb,
  status donation_status DEFAULT 'pending',
  receipt_number text UNIQUE,
  received_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  reconciled boolean DEFAULT false,
  reconciled_at timestamp with time zone,
  reconciled_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT donations_pkey PRIMARY KEY (id),
  CONSTRAINT donations_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE SET NULL,
  CONSTRAINT donations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL,
  CONSTRAINT donations_reconciled_by_fkey FOREIGN KEY (reconciled_by) REFERENCES public.users(id),
  CONSTRAINT fk_donations_puja_id FOREIGN KEY (puja_id) REFERENCES public.puja_series(id) ON DELETE SET NULL
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  community_id uuid,
  event_id uuid,
  budget_id uuid,
  vendor_name text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  category expense_category NOT NULL,
  description text,
  invoice_number text,
  paid_on date NOT NULL,
  expense_date date NOT NULL,
  payment_method text,
  receipt_url text,
  attachments text[],
  approved_by uuid,
  note text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE,
  CONSTRAINT expenses_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL,
  CONSTRAINT expenses_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE SET NULL,
  CONSTRAINT expenses_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id),
  CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- =====================================================
-- PUJA MANAGEMENT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.puja_series (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  location text NOT NULL,
  priest_id uuid NOT NULL,
  recurring_pattern recurrence_pattern DEFAULT 'none',
  recurring_frequency integer DEFAULT 1,
  recurring_days_of_week integer[],
  recurring_day_of_month integer,
  recurring_week_of_month integer,
  recurring_end_date date,
  recurring_count integer,
  timezone text DEFAULT 'Asia/Kolkata',
  default_start_time time without time zone NOT NULL,
  default_duration_minutes integer DEFAULT 60,
  visibility event_visibility DEFAULT 'public',
  active boolean DEFAULT true,
  subscription_enabled boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT puja_series_pkey PRIMARY KEY (id),
  CONSTRAINT puja_series_priest_id_fkey FOREIGN KEY (priest_id) REFERENCES public.users(id),
  CONSTRAINT puja_series_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.puja_instances (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  series_id uuid NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  priest_id uuid,
  status puja_status DEFAULT 'scheduled',
  is_exception boolean DEFAULT false,
  exception_data jsonb,
  actual_start_time timestamp with time zone,
  actual_end_time timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT puja_instances_pkey PRIMARY KEY (id),
  CONSTRAINT puja_instances_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.puja_series(id) ON DELETE CASCADE,
  CONSTRAINT puja_instances_priest_id_fkey FOREIGN KEY (priest_id) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.puja_exceptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  series_id uuid NOT NULL,
  original_date date NOT NULL,
  action text NOT NULL CHECK (action IN ('cancel', 'reschedule', 'modify')),
  new_start_time timestamp with time zone,
  new_end_time timestamp with time zone,
  new_priest_id uuid,
  reason text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT puja_exceptions_pkey PRIMARY KEY (id),
  CONSTRAINT puja_exceptions_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.puja_series(id) ON DELETE CASCADE,
  CONSTRAINT puja_exceptions_new_priest_id_fkey FOREIGN KEY (new_priest_id) REFERENCES public.users(id),
  CONSTRAINT puja_exceptions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.puja_subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  puja_series_id uuid NOT NULL,
  user_id uuid NOT NULL,
  notify_changes boolean DEFAULT true,
  notify_reminders boolean DEFAULT true,
  reminder_minutes integer DEFAULT 30,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT puja_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT puja_subscriptions_puja_series_id_fkey FOREIGN KEY (puja_series_id) REFERENCES public.puja_series(id) ON DELETE CASCADE,
  CONSTRAINT puja_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_puja_subscription UNIQUE (puja_series_id, user_id)
);

-- =====================================================
-- VOLUNTEER MANAGEMENT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.volunteers (
  user_id uuid NOT NULL,
  skills text[],
  languages text[],
  availability jsonb DEFAULT '{}'::jsonb,
  emergency_contact jsonb,
  verified boolean DEFAULT false,
  verified_by uuid,
  verified_at timestamp with time zone,
  total_hours numeric DEFAULT 0,
  rating numeric,
  badges jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT volunteers_pkey PRIMARY KEY (user_id),
  CONSTRAINT volunteers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT volunteers_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  community_id uuid,
  event_id uuid,
  event_instance_id uuid,
  role text NOT NULL,
  description text,
  location text NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  capacity integer DEFAULT 1,
  min_volunteers integer DEFAULT 1,
  skills_required text[],
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shifts_pkey PRIMARY KEY (id),
  CONSTRAINT shifts_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE,
  CONSTRAINT shifts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT shifts_event_instance_id_fkey FOREIGN KEY (event_instance_id) REFERENCES public.event_instances(id) ON DELETE CASCADE,
  CONSTRAINT shifts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.shift_assignments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  shift_id uuid NOT NULL,
  volunteer_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamp with time zone DEFAULT now(),
  confirmed boolean DEFAULT false,
  confirmed_at timestamp with time zone,
  CONSTRAINT shift_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT shift_assignments_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE,
  CONSTRAINT shift_assignments_volunteer_id_fkey FOREIGN KEY (volunteer_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT shift_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id),
  CONSTRAINT unique_shift_volunteer UNIQUE (shift_id, volunteer_id)
);

CREATE TABLE IF NOT EXISTS public.shift_attendance (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  shift_id uuid NOT NULL,
  volunteer_id uuid NOT NULL,
  present boolean DEFAULT false,
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone,
  hours_worked numeric,
  marked_by uuid,
  marked_at timestamp with time zone,
  notes text,
  CONSTRAINT shift_attendance_pkey PRIMARY KEY (id),
  CONSTRAINT shift_attendance_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE,
  CONSTRAINT shift_attendance_volunteer_id_fkey FOREIGN KEY (volunteer_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT shift_attendance_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES public.users(id),
  CONSTRAINT unique_shift_attendance UNIQUE (shift_id, volunteer_id)
);

-- =====================================================
-- COMMUNICATION TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  channel message_channel NOT NULL,
  recipient_id uuid,
  recipient_phone text,
  recipient_email text,
  subject text,
  body text NOT NULL,
  template_id text,
  template_params jsonb,
  status message_status DEFAULT 'pending',
  priority integer DEFAULT 0,
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  failed_at timestamp with time zone,
  error_message text,
  provider_message_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT messages_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  body text NOT NULL,
  audience audience_segment DEFAULT 'all',
  audience_filter jsonb DEFAULT '{}'::jsonb,
  priority integer DEFAULT 0,
  publish_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  pinned boolean DEFAULT false,
  community_id uuid,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE,
  CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- =====================================================
-- BROCHURE & DOCUMENT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.brochure_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  header_html text,
  footer_html text,
  styles text,
  variables jsonb DEFAULT '[]'::jsonb,
  active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT brochure_templates_pkey PRIMARY KEY (id),
  CONSTRAINT brochure_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.brochures (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  template_id uuid,
  title text NOT NULL,
  content jsonb NOT NULL,
  event_id uuid,
  pptx_url text,
  pdf_url text,
  public_url text,
  published boolean DEFAULT false,
  published_at timestamp with time zone,
  downloads integer DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT brochures_pkey PRIMARY KEY (id),
  CONSTRAINT brochures_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.brochure_templates(id) ON DELETE SET NULL,
  CONSTRAINT brochures_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT brochures_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- =====================================================
-- SYSTEM TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.roles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name system_role NOT NULL UNIQUE,
  description text,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.org_settings (
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT org_settings_pkey PRIMARY KEY (key),
  CONSTRAINT org_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  provider payment_provider NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamp with time zone,
  error text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_events_pkey PRIMARY KEY (id),
  CONSTRAINT unique_payment_event UNIQUE (provider, event_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- User Roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_community ON public.user_roles(community_id);

-- Communities
CREATE INDEX IF NOT EXISTS idx_communities_owner ON public.communities(owner_id);
CREATE INDEX IF NOT EXISTS idx_communities_status ON public.communities(status);
CREATE INDEX IF NOT EXISTS idx_communities_slug ON public.communities(slug);

-- Community Members
CREATE INDEX IF NOT EXISTS idx_community_members_community ON public.community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_status ON public.community_members(status);

-- Activity Timeline
CREATE INDEX IF NOT EXISTS idx_activity_timeline_community ON public.activity_timeline(community_id);
CREATE INDEX IF NOT EXISTS idx_activity_timeline_user ON public.activity_timeline(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_timeline_actor ON public.activity_timeline(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_timeline_created ON public.activity_timeline(created_at DESC);

-- Events
CREATE INDEX IF NOT EXISTS idx_events_community ON public.events(community_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON public.events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_visibility ON public.events(visibility);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_community ON public.tasks(community_id);
CREATE INDEX IF NOT EXISTS idx_tasks_event ON public.tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- Donations
CREATE INDEX IF NOT EXISTS idx_donations_community ON public.donations(community_id);
CREATE INDEX IF NOT EXISTS idx_donations_event ON public.donations(event_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON public.donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_received_at ON public.donations(received_at);
CREATE INDEX IF NOT EXISTS idx_donations_source ON public.donations(source);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_community ON public.expenses(community_id);
CREATE INDEX IF NOT EXISTS idx_expenses_event ON public.expenses(event_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON public.communities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_members_updated_at BEFORE UPDATE ON public.community_members
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON public.donations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Community policies
CREATE POLICY "View accessible communities" ON public.communities
  FOR SELECT USING (
    id IN (
      SELECT community_id FROM public.community_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR owner_id = auth.uid()
  );

-- Community members policies
CREATE POLICY "View members of accessible communities" ON public.community_members
  FOR SELECT USING (
    community_id IN (
      SELECT community_id FROM public.community_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Activity timeline policies
CREATE POLICY "View activity in accessible communities" ON public.activity_timeline
  FOR SELECT USING (
    community_id IN (
      SELECT community_id FROM public.community_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Events policies
CREATE POLICY "View accessible events" ON public.events
  FOR SELECT USING (
    visibility = 'public'
    OR community_id IN (
      SELECT community_id FROM public.community_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- =====================================================
-- SEED DATA FOR TESTING
-- =====================================================

-- Insert system roles
INSERT INTO public.roles (name, description) VALUES
  ('super_admin', 'Full system access'),
  ('temple_admin', 'Temple administration'),
  ('finance', 'Financial management'),
  ('community_owner', 'Community owner'),
  ('community_lead', 'Community leadership'),
  ('member', 'Community member')
ON CONFLICT (name) DO NOTHING;
