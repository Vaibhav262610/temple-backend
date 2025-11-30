// Public Events API - For website integration
const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');

// GET all public events (no authentication required)
router.get('/', async (req, res) => {
    try {
        const {
            status = 'published',
            limit = 50,
            upcoming = 'true',
            community_id
        } = req.query;

        console.log('📅 Fetching public events:', { status, limit, upcoming, community_id });

        let query = supabaseService.client
            .from('events')
            .select(`
        id,
        title,
        description,
        location,
        starts_at,
        ends_at,
        image_url,
        thumbnail_url,
        visibility,
        status,
        capacity,
        registration_required,
        created_at,
        community_id
      `)
            .eq('visibility', 'public')
            .eq('status', status)
            .order('starts_at', { ascending: true });

        // Filter by community if specified
        if (community_id) {
            query = query.eq('community_id', community_id);
        }

        // Filter upcoming events
        if (upcoming === 'true') {
            const now = new Date().toISOString();
            query = query.gte('starts_at', now);
        }

        // Apply limit
        query = query.limit(parseInt(limit));

        const { data: events, error } = await query;

        if (error) {
            console.error('❌ Error fetching public events:', error);
            throw error;
        }

        console.log(`✅ Found ${events?.length || 0} public events`);

        res.json({
            success: true,
            data: events || [],
            count: events?.length || 0
        });
    } catch (error) {
        console.error('❌ Error in public events route:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch events',
            error: error.message
        });
    }
});

// GET single public event by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log('📅 Fetching public event:', id);

        const { data: event, error } = await supabaseService.client
            .from('events')
            .select(`
        id,
        title,
        description,
        location,
        starts_at,
        ends_at,
        image_url,
        thumbnail_url,
        visibility,
        status,
        capacity,
        registration_required,
        created_at,
        community_id
      `)
            .eq('id', id)
            .eq('visibility', 'public')
            .eq('status', 'published')
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found or not public'
                });
            }
            throw error;
        }

        console.log('✅ Found public event:', event.title);

        res.json({
            success: true,
            data: event
        });
    } catch (error) {
        console.error('❌ Error fetching public event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch event',
            error: error.message
        });
    }
});

// GET upcoming events count
router.get('/stats/upcoming', async (req, res) => {
    try {
        const now = new Date().toISOString();

        const { count, error } = await supabaseService.client
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('visibility', 'public')
            .eq('status', 'published')
            .gte('starts_at', now);

        if (error) throw error;

        res.json({
            success: true,
            data: { upcoming_count: count || 0 }
        });
    } catch (error) {
        console.error('❌ Error fetching event stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch event stats',
            error: error.message
        });
    }
});

module.exports = router;
