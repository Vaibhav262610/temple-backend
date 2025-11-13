// Add this as a temporary route to check database schema
const express = require('express');
const router = express.Router();
const supabaseService = require('./src/services/supabaseService');

// Temporary endpoint to check database schema
router.get('/check-schema', async (req, res) => {
    try {
        console.log('🔍 Checking database schema...');

        // Try to get a user to see the table structure
        const { data, error } = await supabaseService.client
            .from('users')
            .select('*')
            .limit(1);

        if (error) {
            return res.json({
                success: false,
                error: error.message,
                message: 'Failed to query users table'
            });
        }

        const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
        const hasRole = columns.includes('role');
        const hasPasswordHash = columns.includes('password_hash');

        // Try to insert a test record with role
        let roleTestResult = null;
        try {
            const testData = {
                id: 'schema-test-' + Date.now(),
                email: 'schema-test@example.com',
                full_name: 'Schema Test User',
                role: 'chairman',
                password_hash: 'test_hash'
            };

            const { data: insertData, error: insertError } = await supabaseService.client
                .from('users')
                .insert(testData)
                .select('*')
                .single();

            if (insertError) {
                roleTestResult = {
                    success: false,
                    error: insertError.message
                };
            } else {
                roleTestResult = {
                    success: true,
                    insertedRole: insertData.role
                };

                // Clean up
                await supabaseService.client
                    .from('users')
                    .delete()
                    .eq('id', testData.id);
            }
        } catch (testError) {
            roleTestResult = {
                success: false,
                error: testError.message
            };
        }

        res.json({
            success: true,
            schema: {
                totalUsers: data?.length || 0,
                availableColumns: columns,
                hasRoleColumn: hasRole,
                hasPasswordHashColumn: hasPasswordHash,
                roleTestResult
            },
            recommendation: hasRole
                ? 'Role column exists - admin registration should work properly'
                : 'Role column missing - run add-user-role-field.sql in Supabase Dashboard'
        });

    } catch (error) {
        console.error('Schema check error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;