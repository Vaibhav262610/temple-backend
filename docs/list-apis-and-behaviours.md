
## Temple Management System - Complete API & Function Reference

### **WEBHOOK HANDLERS**

#### 1. **Stripe Webhook Handler** - `supabase/functions/stripe-webhook/index.ts`
- **Method**: POST
- **Purpose**: Process Stripe payment webhooks
- **Behaviors**:
  - Verifies webhook signature using Stripe signature
  - Checks for event idempotency to prevent duplicate processing
  - Logs all events in `payment_events` table
  - Handles multiple event types:
    - `checkout.session.completed`: Creates donation records with fee calculation
    - `payment_intent.succeeded`: Updates donation status to completed
    - `charge.refunded`: Updates donation status to refunded
    - `payment_intent.payment_failed`: Updates donation status to failed
  - Sends confirmation emails for successful donations
  - Extracts metadata (community_id, event_id, puja_id) from session

#### 2. **Razorpay Webhook Handler** - `supabase/functions/razorpay-webhook/index.ts`
- **Method**: POST
- **Purpose**: Process Razorpay payment webhooks
- **Behaviors**:
  - Verifies webhook signature using HMAC SHA256
  - Handles event idempotency
  - Processes events:
    - `payment.captured`: Creates completed donation records
    - `payment.failed`: Creates/updates failed donation records
  - Converts amounts from paise to rupees
  - Stores payment metadata and error details

### **COMMUNICATION & MESSAGING**

#### 3. **Broadcast Message Handler** - `supabase/functions/broadcast/index.ts`
- **Method**: POST with OPTIONS support
- **Purpose**: Send bulk messages to different audience segments
- **Behaviors**:
  - Supports multiple audience types:
    - `all`: All active users
    - `community_members`: Active community members
    - `donors`: Recent donors (past year)
    - `volunteers`: Active volunteers
    - `event_attendees`: Registered event attendees
  - Processes message templates with parameter substitution
  - Respects user notification preferences
  - Creates message records for each recipient
  - Supports both email and SMS channels

#### 4. **Email Processor** - `supabase/functions/process-emails/index.ts`
- **Method**: GET (scheduled function)
- **Purpose**: Process pending email messages
- **Behaviors**:
  - Fetches up to 50 pending email messages
  - Supports multiple email providers:
    - Resend API
    - SendGrid API
    - AWS SES (placeholder)
  - Updates message status (processing → sent/failed)
  - Logs delivery timestamps and error messages
  - Handles provider-specific API formats

#### 5. **SMS Processor** - `supabase/functions/process-sms/index.ts`
- **Method**: GET (scheduled function)
- **Purpose**: Process pending SMS messages
- **Behaviors**:
  - Fetches up to 50 pending SMS messages
  - Supports SMS providers:
    - Twilio API
    - TextLocal API
  - Updates message status and delivery tracking
  - Handles provider authentication and formatting

### **EVENT MANAGEMENT**

#### 6. **Recurring Event Expansion** - `supabase/functions/expand-recurring/index.ts`
- **Method**: POST with OPTIONS support
- **Purpose**: Generate event instances from recurring patterns
- **Behaviors**:
  - Takes eventId, fromDate, toDate as parameters
  - Supports recurring patterns: daily, weekly, monthly, yearly
  - Generates instances based on:
    - Frequency intervals
    - Days of week
    - Day of month
    - Week of month
  - Creates `event_instances` records
  - Handles pattern matching logic
  - Respects end dates and occurrence limits

#### 7. **Event Registration Handler** - `supabase/functions/event-registration/index.ts`
- **Method**: POST with OPTIONS support
- **Purpose**: Handle event registrations and check-ins
- **Behaviors**:
  - **Register action**:
    - Checks event capacity limits
    - Creates registration records
    - Sends confirmation emails with event details
  - **Cancel action**:
    - Updates registration status to cancelled
    - Records cancellation timestamp
  - **Check-in action**:
    - Updates status to attended
    - Records check-in timestamp

### **FINANCIAL MANAGEMENT**

#### 8. **Donation Analytics** - `supabase/functions/donation-analytics/index.ts`
- **Method**: GET with OPTIONS support
- **Purpose**: Generate donation analytics and reports
- **Behaviors**:
  - Supports multiple report types:
    - `summary`: Total amounts, counts, averages by provider/currency
    - `trends`: Daily and monthly donation trends
    - `sources`: Breakdown by donation sources
    - `top_donors`: Top 10 donors by total amount
  - Filters by date range and community
  - Returns structured analytics data
  - Only processes completed donations

#### 9. **Financial Reports** - `supabase/functions/financial-reports/index.ts`
- **Method**: GET with OPTIONS support
- **Purpose**: Generate comprehensive financial reports
- **Behaviors**:
  - **Income Statement**:
    - Gross donations, payment fees, net donations
    - Total expenses by category
    - Net income calculation
  - **Cash Flow Report**:
    - Monthly inflow and outflow analysis
    - Time-series financial data
  - **Donor Report**:
    - Individual donor summaries
    - Donation history and patterns
  - Supports JSON and CSV export formats
  - Date range filtering

### **USER & SYSTEM MANAGEMENT**

#### 10. **User Management** - `supabase/functions/user-management/index.ts`
- **Method**: POST with OPTIONS support
- **Purpose**: Handle user administration tasks
- **Behaviors**:
  - **Bulk Invite**:
    - Creates invitation records with expiry
    - Sends invitation emails
    - Assigns default roles
  - **Deactivate User**:
    - Updates user status to inactive
    - Records deactivation timestamp
  - **Reset Password**:
    - Triggers password reset flow
    - Integrates with auth provider

#### 11. **Backup Data** - `supabase/functions/backup-data/index.ts`
- **Method**: POST with OPTIONS support
- **Purpose**: Create database backups
- **Behaviors**:
  - Takes array of table names to backup
  - Exports data in JSON format
  - Records backup metadata
  - Calculates backup size
  - Provides downloadable backup files
  - Creates backup history records

#### 12. **Inventory Management** - `supabase/functions/inventory/index.ts`
- **Method**: GET with OPTIONS support
- **Purpose**: Manage temple inventory
- **Behaviors**:
  - **Low Stock Alert**:
    - Identifies items below minimum quantity
    - Sends email alerts to administrators
    - Returns count of low stock items
  - **Update Stock**:
    - Supports add, subtract, set operations
    - Logs inventory transactions
    - Updates item quantities and timestamps
    - Maintains transaction history

#### 13. **Notification Preferences** - `supabase/functions/notification-preferences/index.ts`
- **Method**: POST with OPTIONS support
- **Purpose**: Update user notification settings
- **Behaviors**:
  - Updates user preferences in database
  - Validates user ID requirements
  - Stores preference changes
  - Supports granular notification controls

### **DATABASE FUNCTIONS**

#### 14. **Helper Functions** (from schema-rsl.txt)

**User Role Functions**:
- `user_has_role(user_id UUID, role_name user_role_type)`: Checks if user has specific role
- `is_community_member(user_id UUID, community_id UUID)`: Validates community membership

**Recurring Event Functions**:
- `generate_event_instances(event_id UUID, from_date DATE, to_date DATE)`: Creates event instances
- `matches_recurring_pattern(event RECORD, date TIMESTAMPTZ)`: Pattern matching logic
- `get_week_of_month(date DATE)`: Calendar helper function

**Financial Functions**:
- `get_community_financial_summary(community_id UUID, from_date DATE, to_date DATE)`: Community finances
- `get_donations_by_source(from_date DATE, to_date DATE)`: Donation source analysis

**Utility Functions**:
- `update_updated_at()`: Timestamp trigger function
- `create_audit_log()`: Audit logging trigger
- `create_activity_timeline()`: Activity tracking trigger
- `generate_receipt_number()`: Receipt number generation

### **TRIGGER BEHAVIORS**

#### Automated Triggers:
- **Update Timestamps**: Auto-updates `updated_at` on record changes
- **Audit Logging**: Tracks all data changes with old/new values
- **Activity Timeline**: Creates activity records for public events
- **Receipt Generation**: Auto-generates receipt numbers for donations
- **Event Instance Generation**: Auto-creates instances for recurring events

### **ROW LEVEL SECURITY POLICIES**

#### Access Control Behaviors:
- **Users**: Can view own profile, public users can see basic info
- **Communities**: Public visibility controls, member-only access
- **Events**: Public/community/private visibility levels
- **Financial**: Role-based access (finance role, community owners)
- **Volunteers**: Self-management, coordinator oversight
- **Pujas**: Public visibility, priest management
- **Messages**: User-specific message access
- **Audit Logs**: Self-access and admin oversight

This comprehensive system provides complete temple management functionality with robust security, financial tracking, communication tools, and automated workflows.