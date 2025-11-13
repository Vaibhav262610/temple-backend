// backend/src/routes/budgetRequests.js - Budget Request Management
const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');

// ===== BUDGET REQUESTS ROUTES =====

// Get all budget requests (for finance team)
router.get('/', async (req, res) => {
    try {
        const { status = 'all', community_id } = req.query;

        console.log('📋 Fetching budget requests');

        // Check if table exists first
        const { data: tableCheck, error: tableError } = await supabaseService.client
            .from('budget_requests')
            .select('id')
            .limit(1);

        if (tableError && tableError.message.includes('does not exist')) {
            console.log('⚠️ Budget requests table does not exist yet');
            return res.json({
                success: true,
                data: [],
                total: 0,
                message: 'Budget requests table not created yet. Please create the table using MANUAL_TABLE_CREATION.sql first.'
            });
        }

        let query = supabaseService.client
            .from('budget_requests')
            .select('*');

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        if (community_id) {
            query = query.eq('community_id', community_id);
        }

        const { data: requests, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Supabase budget requests query error:', error);
            throw error;
        }

        // Fetch community data separately and merge
        const requestsWithCommunity = [];
        if (requests && requests.length > 0) {
            for (const request of requests) {
                // Fetch community data for each request
                const { data: communityData } = await supabaseService.client
                    .from('communities')
                    .select('id, name')
                    .eq('id', request.community_id)
                    .single();

                requestsWithCommunity.push({
                    ...request,
                    community: communityData || { id: request.community_id, name: 'Unknown Community' }
                });
            }
        }

        console.log('✅ Budget requests fetched:', requestsWithCommunity?.length || 0);

        res.json({
            success: true,
            data: requestsWithCommunity || [],
            total: requestsWithCommunity?.length || 0
        });
    } catch (error) {
        console.error('❌ Error fetching budget requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch budget requests',
            error: error.message
        });
    }
});

// Get budget requests for a specific community
router.get('/community/:communityId', async (req, res) => {
    try {
        const { communityId } = req.params;
        const { status = 'all' } = req.query;

        console.log('📋 Fetching budget requests for community:', communityId);

        let query = supabaseService.client
            .from('budget_requests')
            .select('*')
            .eq('community_id', communityId);

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: requests, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Supabase community budget requests query error:', error);
            throw error;
        }

        console.log('✅ Community budget requests fetched:', requests?.length || 0);

        res.json({
            success: true,
            data: requests || [],
            total: requests?.length || 0
        });
    } catch (error) {
        console.error('❌ Error fetching community budget requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch community budget requests',
            error: error.message
        });
    }
});

// Create new budget request
router.post('/', async (req, res) => {
    try {
        const {
            community_id,
            budget_amount,
            purpose,
            event_name,
            documents,
            requested_by
        } = req.body;

        console.log('💰 Creating budget request for community:', community_id);
        console.log('📝 Request data:', { budget_amount, purpose, event_name });

        // Validate required fields
        if (!community_id || !budget_amount || !purpose) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: community_id, budget_amount, purpose'
            });
        }

        const requestData = {
            community_id,
            budget_amount: parseFloat(budget_amount),
            purpose,
            event_name: event_name || null,
            documents: documents || [],
            requested_by: requested_by || null,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        const { data: request, error } = await supabaseService.client
            .from('budget_requests')
            .insert(requestData)
            .select('*')
            .single();

        if (error) {
            console.error('❌ Supabase budget request creation error:', error);
            throw error;
        }

        console.log('✅ Budget request created successfully:', request.id);

        res.status(201).json({
            success: true,
            data: request,
            message: 'Budget request submitted successfully'
        });
    } catch (error) {
        console.error('❌ Error creating budget request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create budget request',
            error: error.message
        });
    }
});

// Approve budget request
router.put('/:requestId/approve', async (req, res) => {
    try {
        const { requestId } = req.params;
        const { approved_by, approval_notes, approved_amount } = req.body;

        console.log('✅ Approving budget request:', requestId);

        const updateData = {
            status: 'approved',
            approved_by: approved_by || null,
            approval_notes: approval_notes || null,
            approved_amount: approved_amount ? parseFloat(approved_amount) : null,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: request, error } = await supabaseService.client
            .from('budget_requests')
            .update(updateData)
            .eq('id', requestId)
            .select('*')
            .single();

        if (error) {
            console.error('❌ Supabase budget request approval error:', error);
            throw error;
        }

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Budget request not found'
            });
        }

        console.log('✅ Budget request approved successfully:', requestId);

        res.json({
            success: true,
            data: request,
            message: 'Budget request approved successfully'
        });
    } catch (error) {
        console.error('❌ Error approving budget request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve budget request',
            error: error.message
        });
    }
});

// Reject budget request
router.put('/:requestId/reject', async (req, res) => {
    try {
        const { requestId } = req.params;
        const { rejected_by, rejection_reason } = req.body;

        console.log('❌ Rejecting budget request:', requestId);

        const updateData = {
            status: 'rejected',
            rejected_by: rejected_by || null,
            rejection_reason: rejection_reason || null,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: request, error } = await supabaseService.client
            .from('budget_requests')
            .update(updateData)
            .eq('id', requestId)
            .select('*')
            .single();

        if (error) {
            console.error('❌ Supabase budget request rejection error:', error);
            throw error;
        }

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Budget request not found'
            });
        }

        console.log('✅ Budget request rejected successfully:', requestId);

        res.json({
            success: true,
            data: request,
            message: 'Budget request rejected successfully'
        });
    } catch (error) {
        console.error('❌ Error rejecting budget request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject budget request',
            error: error.message
        });
    }
});

// Delete budget request
router.delete('/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;

        console.log('🗑️ Deleting budget request:', requestId);

        const { data: request, error } = await supabaseService.client
            .from('budget_requests')
            .delete()
            .eq('id', requestId)
            .select('*')
            .single();

        if (error) {
            console.error('❌ Supabase budget request delete error:', error);
            throw error;
        }

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Budget request not found'
            });
        }

        console.log('✅ Budget request deleted successfully:', requestId);

        res.json({
            success: true,
            data: request,
            message: 'Budget request deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting budget request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete budget request',
            error: error.message
        });
    }
});

module.exports = router;