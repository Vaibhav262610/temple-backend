// Priest Bookings Routes
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// Get all priest bookings
router.get('/', async (req, res) => {
    try {
        const { status, start_date, end_date, page = 1, limit = 50 } = req.query;

        let query = supabase
            .from('priest_bookings')
            .select('*, priests(name, phone, specialization)')
            .order('created_at', { ascending: false });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        if (start_date) {
            query = query.gte('preferred_date', start_date);
        }

        if (end_date) {
            query = query.lte('preferred_date', end_date);
        }

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: data || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count || data?.length || 0
            }
        });

    } catch (error) {
        console.error('❌ Error fetching priest bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch priest bookings',
            error: error.message
        });
    }
});

// Get single booking by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('priest_bookings')
            .select('*, priests(name, phone, specialization)')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('❌ Error fetching booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking',
            error: error.message
        });
    }
});

// Update booking status
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, priest_id, admin_notes } = req.body;

        const updateData = {
            updated_at: new Date().toISOString()
        };

        if (status) updateData.status = status;
        if (priest_id !== undefined) updateData.priest_id = priest_id || null;
        if (admin_notes !== undefined) updateData.admin_notes = admin_notes;

        const { data, error } = await supabase
            .from('priest_bookings')
            .update(updateData)
            .eq('id', id)
            .select('*, priests(name, phone, specialization)')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Booking updated successfully',
            data
        });

    } catch (error) {
        console.error('❌ Error updating booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update booking',
            error: error.message
        });
    }
});

// Delete booking
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('priest_bookings')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Booking deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete booking',
            error: error.message
        });
    }
});

// Get booking statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const { data: allBookings, error } = await supabase
            .from('priest_bookings')
            .select('status, created_at');

        if (error) throw error;

        const stats = {
            total: allBookings?.length || 0,
            pending: allBookings?.filter(b => b.status === 'pending').length || 0,
            confirmed: allBookings?.filter(b => b.status === 'confirmed').length || 0,
            completed: allBookings?.filter(b => b.status === 'completed').length || 0,
            cancelled: allBookings?.filter(b => b.status === 'cancelled').length || 0
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('❌ Error fetching booking stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking statistics',
            error: error.message
        });
    }
});

module.exports = router;
