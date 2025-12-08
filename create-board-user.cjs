const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const SUPABASE_URL = 'https://ntxqedcyxsqdpauphunc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50eHFlZGN5eHNxZHBhdXBodW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MzA3MjQsImV4cCI6MjA3NTUwNjcyNH0.WmL5Ly6utECuTt2qTWbKqltLP73V3hYPLUeylBELKTk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createBoardUser() {
    try {
        const email = 'boardmember@temple.com';
        const password = 'qwertyuiop';
        const fullName = 'Board Member Test';
        const role = 'chair_board';

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const now = new Date().toISOString();

        // Insert user into database
        const { data, error } = await supabase
            .from('users')
            .insert({
                id: randomUUID(),
                email: email.toLowerCase(),
                password_hash: hashedPassword,
                full_name: fullName,
                role: role,
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Error creating user:', error.message);
            return;
        }

        console.log('✅ Board member user created successfully!');
        console.log('');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('👤 Role:', role);
        console.log('');
        console.log('User data:', data);

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

createBoardUser();
