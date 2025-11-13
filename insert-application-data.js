// Insert volunteer application data matching existing structure
require('dotenv').config();
const supabaseService = require('./src/services/supabaseService');

async function insertApplicationData() {
    console.log('📝 Inserting volunteer application data...');

    try {
        // First check the existing structure
        const { data: existingData, error: checkError } = await supabaseService.client
            .from('volunteer_applications')
            .select('*')
            .limit(1);

        if (checkError) {
            console.error('❌ Error checking existing structure:', checkError);
            return;
        }

        console.log('📋 Existing structure sample:', existingData?.[0] ? Object.keys(existingData[0]) : 'No data');

        // Get a community ID
        const { data: communities, error: communityError } = await supabaseService.client
            .from('communities')
            .select('id')
            .limit(1);

        if (communityError || !communities || communities.length === 0) {
            console.error('❌ No communities found.');
            return;
        }

        const communityId = communities[0].id;
        console.log('📍 Using community ID:', communityId);

        // Clear existing data
        console.log('🧹 Clearing existing data...');
        await supabaseService.client
            .from('volunteer_applications')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        // Insert data matching the existing structure (based on what we saw earlier)
        const sampleApplications = [
            {
                community_id: communityId,
                first_name: 'Anita',
                last_name: 'Gupta',
                email: 'anita.gupta@email.com',
                phone: '+91 98765 43210',
                skills: ['Teaching', 'Public Speaking', 'Child Psychology'],
                interests: ['Youth Programs', 'Teaching', 'Event Coordination'],
                motivation: 'I want to contribute to the spiritual development of young minds and help preserve our cultural values.',
                status: 'pending',
                applied_at: new Date().toISOString()
            },
            {
                community_id: communityId,
                first_name: 'Vikram',
                last_name: 'Singh',
                email: 'vikram.singh@email.com',
                phone: '+91 87654 32109',
                skills: ['Electrical Work', 'Plumbing', 'Security'],
                interests: ['Temple Services', 'Maintenance', 'Security'],
                motivation: 'I want to serve the temple and ensure devotees have a safe and comfortable environment for worship.',
                status: 'under-review',
                applied_at: new Date().toISOString()
            },
            {
                community_id: communityId,
                first_name: 'Lakshmi',
                last_name: 'Devi',
                email: 'lakshmi.devi@email.com',
                phone: '+91 76543 21098',
                skills: ['Cooking', 'Food Safety', 'Kitchen Management'],
                interests: ['Kitchen Management', 'Prasadam Preparation', 'Festival Cooking'],
                motivation: 'Cooking prasadam is my way of serving the divine and the devotees.',
                status: 'approved',
                applied_at: new Date().toISOString()
            },
            {
                community_id: communityId,
                first_name: 'Ravi',
                last_name: 'Shankar',
                email: 'ravi.shankar@email.com',
                phone: '+91 65432 10987',
                skills: ['Tabla', 'Harmonium', 'Singing'],
                interests: ['Music', 'Bhajan', 'Cultural Programs'],
                motivation: 'Music is my passion and I want to share it in service of the divine.',
                status: 'rejected',
                applied_at: new Date().toISOString()
            }
        ];

        console.log('📤 Inserting sample applications...');
        const { data: insertData, error: insertError } = await supabaseService.client
            .from('volunteer_applications')
            .insert(sampleApplications);

        if (insertError) {
            console.error('❌ Error inserting data:', insertError);
        } else {
            console.log('✅ Sample applications inserted successfully!');
        }

        // Test the data
        const { data: testData, error: testError } = await supabaseService.client
            .from('volunteer_applications')
            .select('*');

        if (testError) {
            console.error('❌ Error testing data:', testError);
        } else {
            console.log('✅ Test query successful, found', testData?.length || 0, 'applications');
            testData?.forEach(app => {
                console.log(`📋 ${app.first_name} ${app.last_name} - ${app.status}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

insertApplicationData().then(() => {
    console.log('🏁 Script completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});