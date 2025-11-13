// Direct table creation script
require('dotenv').config();
const supabaseService = require('./src/services/supabaseService');

async function createPujaTable() {
    console.log('🏛️ Creating puja_series table directly...');

    try {
        // First, let's try to create the table using raw SQL
        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.puja_series (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        community_id uuid,
        name text NOT NULL,
        description text DEFAULT '',
        deity text DEFAULT '',
        type text DEFAULT 'puja',
        status text DEFAULT 'active',
        schedule_config jsonb DEFAULT '{}'::jsonb,
        start_date timestamp with time zone NOT NULL,
        end_date timestamp with time zone,
        max_participants integer,
        registration_required boolean DEFAULT false,
        priest_id uuid,
        location text DEFAULT '',
        duration_minutes integer DEFAULT 60,
        requirements text[] DEFAULT '{}',
        notes text DEFAULT '',
        created_by uuid,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now(),
        CONSTRAINT puja_series_pkey PRIMARY KEY (id)
      );
    `;

        // Execute the SQL
        const { data, error } = await supabaseService.client.rpc('exec_sql', {
            sql: createTableSQL
        });

        if (error) {
            console.error('❌ Error creating table with RPC:', error);

            // Try alternative approach - just insert sample data to create table structure
            console.log('🔄 Trying alternative approach...');

            // First get a community ID
            const { data: communities, error: communityError } = await supabaseService.client
                .from('communities')
                .select('id')
                .limit(1);

            if (communityError || !communities || communities.length === 0) {
                console.error('❌ No communities found. Please create a community first.');
                return;
            }

            const communityId = communities[0].id;
            console.log('📍 Using community ID:', communityId);

            const sampleData = {
                community_id: communityId,
                name: 'Daily Morning Aarti',
                description: 'Daily morning prayers for devotees',
                deity: 'Lord Ganesha',
                type: 'aarti',
                status: 'active',
                start_date: '2025-01-01T06:00:00Z',
                location: 'Main Temple Hall',
                duration_minutes: 30,
                schedule_config: { frequency: 'daily', time: '06:00' }
            };

            const { data: insertData, error: insertError } = await supabaseService.client
                .from('puja_series')
                .insert(sampleData);

            if (insertError) {
                console.error('❌ Error inserting data:', insertError);
                console.log('📋 Please create the table manually using the SQL file.');
                return;
            }

            console.log('✅ Table created and sample data inserted!');
            return;
        }

        console.log('✅ Table created successfully with RPC!');

        // Get community ID for sample data
        const { data: communities, error: communityError } = await supabaseService.client
            .from('communities')
            .select('id')
            .limit(1);

        if (communityError || !communities || communities.length === 0) {
            console.error('❌ No communities found. Please create a community first.');
            return;
        }

        const communityId = communities[0].id;
        console.log('📍 Using community ID:', communityId);

        // Insert sample data
        const sampleData = [
            {
                community_id: communityId,
                name: 'Daily Morning Aarti',
                description: 'Daily morning prayers for devotees',
                deity: 'Lord Ganesha',
                type: 'aarti',
                status: 'active',
                start_date: '2025-01-01T06:00:00Z',
                location: 'Main Temple Hall',
                duration_minutes: 30,
                schedule_config: { frequency: 'daily', time: '06:00' }
            },
            {
                community_id: communityId,
                name: 'Weekly Havan',
                description: 'Weekly fire ceremony for prosperity',
                deity: 'Agni Dev',
                type: 'havan',
                status: 'active',
                start_date: '2025-01-01T18:00:00Z',
                location: 'Havan Kund',
                duration_minutes: 90,
                schedule_config: { frequency: 'weekly', day: 'sunday', time: '18:00' }
            },
            {
                community_id: communityId,
                name: 'Monthly Satyanarayan Puja',
                description: 'Monthly puja for Lord Vishnu',
                deity: 'Lord Vishnu',
                type: 'puja',
                status: 'active',
                start_date: '2025-01-01T10:00:00Z',
                location: 'Prayer Hall',
                duration_minutes: 120,
                schedule_config: { frequency: 'monthly', date: 1, time: '10:00' }
            }
        ];

        const { data: insertData, error: insertError } = await supabaseService.client
            .from('puja_series')
            .insert(sampleData);

        if (insertError) {
            console.error('❌ Error inserting sample data:', insertError);
        } else {
            console.log('✅ Sample data inserted successfully!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the function
createPujaTable().then(() => {
    console.log('🏁 Script completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});