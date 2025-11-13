// Create volunteer applications table with simple structure
require('dotenv').config();
const supabaseService = require('./src/services/supabaseService');

async function createVolunteerApplicationsTable() {
    console.log('📝 Creating volunteer_applications table...');

    try {
        // First get a community ID for sample data
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

        // Try to insert a simple application to test if table exists
        const testApplication = {
            community_id: communityId,
            name: 'Test Applicant',
            email: 'test@example.com',
            phone: '+91 98765 43210',
            status: 'pending',
            applied_at: new Date().toISOString()
        };

        const { data: insertData, error: insertError } = await supabaseService.client
            .from('volunteer_applications')
            .insert(testApplication)
            .select('*')
            .single();

        if (insertError) {
            console.error('❌ Error inserting test data:', insertError);
            console.log('📋 Please create the table manually using the SQL file.');
        } else {
            console.log('✅ Test application inserted successfully!');
            console.log('📋 Table exists and is working');

            // Delete the test record
            await supabaseService.client
                .from('volunteer_applications')
                .delete()
                .eq('id', insertData.id);

            console.log('🧹 Test record cleaned up');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

createVolunteerApplicationsTable().then(() => {
    console.log('🏁 Script completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});