// Test puja table directly
require('dotenv').config();
const supabaseService = require('./src/services/supabaseService');

async function testPujaTable() {
    console.log('🧪 Testing puja_series table...');

    try {
        // Test direct query
        const { data, error } = await supabaseService.client
            .from('puja_series')
            .select('*')
            .limit(10);

        if (error) {
            console.error('❌ Error querying table:', error);
            return;
        }

        console.log('✅ Found', data?.length || 0, 'puja series');
        console.log('📋 Data:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testPujaTable().then(() => {
    console.log('🏁 Test completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
});