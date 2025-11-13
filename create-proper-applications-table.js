// Create proper volunteer applications table
require('dotenv').config();
const supabaseService = require('./src/services/supabaseService');

async function createProperApplicationsTable() {
    console.log('📝 Creating proper volunteer_applications table...');

    try {
        // Get a community ID for sample data
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

        // Insert sample applications with proper structure
        const sampleApplications = [
            {
                community_id: communityId,
                name: 'Anita Gupta',
                email: 'anita.gupta@email.com',
                phone: '+91 98765 43210',
                address: 'Mumbai, Maharashtra',
                emergency_contact: 'Rajesh Gupta - +91 98765 43211',
                preferred_areas: ['Youth Programs', 'Teaching', 'Event Coordination'],
                skills: ['Teaching', 'Public Speaking', 'Child Psychology', 'Hindi', 'English'],
                experience: '5 years teaching experience, worked with children\'s programs',
                availability: 'Weekends and evenings',
                motivation: 'I want to contribute to the spiritual development of young minds and help preserve our cultural values.',
                references: [
                    { name: 'Dr. Priya Sharma', relation: 'Former Colleague', phone: '+91 98765 43212' },
                    { name: 'Mrs. Meera Singh', relation: 'Community Leader', phone: '+91 98765 43213' }
                ],
                status: 'pending',
                background_check: 'pending',
                interview_scheduled: false
            },
            {
                community_id: communityId,
                name: 'Vikram Singh',
                email: 'vikram.singh@email.com',
                phone: '+91 87654 32109',
                address: 'Delhi, India',
                emergency_contact: 'Harpreet Kaur - +91 87654 32110',
                preferred_areas: ['Temple Services', 'Maintenance', 'Security'],
                skills: ['Electrical Work', 'Plumbing', 'Security', 'Punjabi', 'Hindi'],
                experience: '10 years in facility management, security background',
                availability: 'Flexible, can work any shift',
                motivation: 'I want to serve the temple and ensure devotees have a safe and comfortable environment for worship.',
                references: [
                    { name: 'Mr. Arjun Kumar', relation: 'Former Supervisor', phone: '+91 87654 32111' },
                    { name: 'Pandit Sharma', relation: 'Temple Priest', phone: '+91 87654 32112' }
                ],
                status: 'under-review',
                background_check: 'completed',
                interview_scheduled: true
            },
            {
                community_id: communityId,
                name: 'Lakshmi Devi',
                email: 'lakshmi.devi@email.com',
                phone: '+91 76543 21098',
                address: 'Chennai, Tamil Nadu',
                emergency_contact: 'Ravi Kumar - +91 76543 21099',
                preferred_areas: ['Kitchen Management', 'Prasadam Preparation', 'Festival Cooking'],
                skills: ['Cooking', 'Food Safety', 'Kitchen Management', 'Tamil', 'Sanskrit'],
                experience: '15 years professional cooking, temple kitchen experience',
                availability: 'Morning shifts preferred',
                motivation: 'Cooking prasadam is my way of serving the divine and the devotees.',
                references: [
                    { name: 'Chef Ramesh', relation: 'Former Colleague', phone: '+91 76543 21100' },
                    { name: 'Mrs. Sita Devi', relation: 'Temple Coordinator', phone: '+91 76543 21101' }
                ],
                status: 'approved',
                background_check: 'completed',
                interview_scheduled: false
            }
        ];

        // Clear existing data and insert new data
        console.log('🧹 Clearing existing data...');
        await supabaseService.client
            .from('volunteer_applications')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        console.log('📤 Inserting new sample data...');
        const { data: insertData, error: insertError } = await supabaseService.client
            .from('volunteer_applications')
            .insert(sampleApplications);

        if (insertError) {
            console.error('❌ Error inserting sample data:', insertError);
        } else {
            console.log('✅ Sample volunteer applications inserted successfully!');
        }

        // Test the data
        const { data: testData, error: testError } = await supabaseService.client
            .from('volunteer_applications')
            .select('*')
            .limit(3);

        if (testError) {
            console.error('❌ Error testing data:', testError);
        } else {
            console.log('✅ Test query successful, found', testData?.length || 0, 'applications');
            console.log('📋 Sample application:', testData?.[0]?.name || 'None');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

createProperApplicationsTable().then(() => {
    console.log('🏁 Script completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});