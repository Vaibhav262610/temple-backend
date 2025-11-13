// Test Supabase Connection from backend directory
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase Connection...\n');
  
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ntxqedcyxsqdpauphunc.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50eHFlZGN5eHNxZHBhdXBodW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MzA3MjQsImV4cCI6MjA3NTUwNjcyNH0.WmL5Ly6utECuTt2qTWbKqltLP73V3hYPLUeylBELKTk';
  
  console.log('🔗 Supabase URL:', SUPABASE_URL);
  console.log('🔑 Using anon key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    });
    
    console.log('\n1️⃣ Testing users table access...');
    
    // Try to query users table
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name')
      .limit(1);
    
    if (error) {
      console.log('❌ Error:', error.message);
      console.log('📊 Error details:', {
        code: error.code,
        hint: error.hint,
        details: error.details
      });
    } else {
      console.log('✅ Success! Found users:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('👤 Sample user:', data[0]);
      }
    }
    
    // Try to insert a test user
    console.log('\n2️⃣ Testing user insertion...');
    const testUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'test-insert@temple.com',
      full_name: 'Test Insert User',
      status: 'active',
      metadata: {},
      preferences: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert(testUser)
      .select('*')
      .single();
    
    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
      console.log('📊 Insert error details:', {
        code: insertError.code,
        hint: insertError.hint
      });
    } else {
      console.log('✅ Insert success! User ID:', insertData.id);
      
      // Clean up - delete the test user
      await supabase.from('users').delete().eq('id', testUser.id);
      console.log('🧹 Test user cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

testSupabaseConnection().catch(console.error);