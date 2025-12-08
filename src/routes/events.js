const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');

// GET all events (general endpoint)
router.get('/events', async (req, res) => {
  try {
    const { status, type, community_id, start_date, end_date, limit = 50, page = 1 } = req.query;

    console.log('📅 Fetching all events with filters:', { status, type, community_id, start_date, end_date, limit, page });

    let query = supabaseService.client
      .from('community_events')
      .select('*')
      .order('start_date', { ascending: true });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (type && type !== 'all') {
      query = query.eq('event_type', type);
    }
    if (community_id && community_id !== 'all') {
      query = query.eq('community_id', community_id);
    }
    if (start_date) {
      query = query.gte('start_date', start_date);
    }
    if (end_date) {
      query = query.lte('start_date', end_date);
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data, error } = await query;

    if (error) throw error;

    // Map database fields to API format
    const mappedData = (data || []).map(event => ({
      ...event,
      starts_at: event.start_date,    // Map start_date to starts_at
      ends_at: event.end_date,        // Map end_date to ends_at
      capacity: event.max_participants, // Map max_participants to capacity
      registration_required: false,   // Default value
      timezone: 'Asia/Kolkata',      // Default timezone
      visibility: 'public',          // Default visibility
      is_recurring: false            // Default recurring
    }));

    res.json({
      success: true,
      data: mappedData,
      total: mappedData.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message
    });
  }
});

// POST create new event (general endpoint)
router.post('/events', async (req, res) => {
  try {
    const {
      community_id,
      title,
      description,
      starts_at,
      ends_at,
      location,
      timezone = 'Asia/Kolkata',
      visibility = 'public',
      status = 'published',
      capacity,
      registration_required = false,
      registration_deadline
    } = req.body;

    console.log('📅 Creating new event:', { title, community_id, starts_at, ends_at });

    // Validate required fields
    if (!title || !starts_at || !ends_at) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, starts_at, ends_at'
      });
    }

    // Validate dates
    if (new Date(ends_at) <= new Date(starts_at)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const eventData = {
      community_id: community_id || null,
      title,
      description: description || '',
      start_date: starts_at,  // Map starts_at to start_date
      end_date: ends_at,      // Map ends_at to end_date
      location: location || '',
      event_type: 'meeting',  // Default event type
      status,
      max_participants: capacity ? parseInt(capacity) : null,  // Map capacity to max_participants
      current_participants: 0,
      organizer_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseService.client
      .from('community_events')
      .insert(eventData)
      .select('*')
      .single();

    if (error) throw error;

    console.log('✅ Event created:', data.id);

    res.status(201).json({
      success: true,
      data,
      message: 'Event created successfully'
    });

  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: error.message
    });
  }
});

// PUT update event (general endpoint)
router.put('/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    const { starts_at, ends_at, capacity, ...otherFields } = req.body;

    // Map API fields to database fields
    const updateData = {
      ...otherFields,
      updated_at: new Date().toISOString()
    };

    // Map field names
    if (starts_at) updateData.start_date = starts_at;
    if (ends_at) updateData.end_date = ends_at;
    if (capacity) updateData.max_participants = capacity;

    console.log('📅 Updating event:', eventId, updateData);

    // Validate dates if both are provided
    if (updateData.start_date && updateData.end_date) {
      if (new Date(updateData.end_date) <= new Date(updateData.start_date)) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }

    const { data, error } = await supabaseService.client
      .from('community_events')
      .update(updateData)
      .eq('id', eventId)
      .select('*')
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    console.log('✅ Event updated:', data.id);

    res.json({
      success: true,
      data,
      message: 'Event updated successfully'
    });

  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event',
      error: error.message
    });
  }
});

// GET all events for a community
router.get('/communities/:id/events', async (req, res) => {
  try {
    const communityId = req.params.id;
    const { status, type, startDate, endDate, limit = 50 } = req.query;

    console.log('📅 Fetching events for community:', communityId);

    let query = supabaseService.client
      .from('community_events')
      .select('*')
      .eq('community_id', communityId)
      .order('start_date', { ascending: true });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('event_type', type);
    }
    if (startDate) {
      query = query.gte('start_date', startDate);
    }
    if (endDate) {
      query = query.lte('start_date', endDate);
    }

    query = query.limit(parseInt(limit));

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      total: data?.length || 0
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message
    });
  }
});

// GET single event
router.get('/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;

    console.log('📅 Fetching event:', eventId);

    const { data, error } = await supabaseService.client
      .from('community_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
      error: error.message
    });
  }
});

// POST create new event
router.post('/communities/:id/events', async (req, res) => {
  try {
    const communityId = req.params.id;
    const {
      title,
      description,
      start_date,
      end_date,
      location,
      event_type = 'meeting',
      max_participants = 50,
      organizer_id
    } = req.body;

    console.log('📅 Creating event for community:', communityId);

    // Validate community ID
    if (!communityId || communityId.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid community ID'
      });
    }

    // Validate required fields
    if (!title || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, start_date, end_date'
      });
    }

    // Validate dates
    if (new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const eventData = {
      community_id: communityId,
      title,
      description: description || '',
      start_date,
      end_date,
      location: location || '',
      event_type,
      status: 'published',
      max_participants: parseInt(max_participants),
      current_participants: 0,
      organizer_id: organizer_id || null
    };

    const { data, error } = await supabaseService.client
      .from('community_events')
      .insert(eventData)
      .select('*')
      .single();

    if (error) throw error;

    console.log('✅ Event created:', data.id);

    res.status(201).json({
      success: true,
      data,
      message: 'Event created successfully'
    });

  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: error.message
    });
  }
});

// PUT update event
router.put('/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    const {
      title,
      description,
      start_date,
      end_date,
      location,
      event_type,
      max_participants,
      status
    } = req.body;

    console.log('📅 Updating event:', eventId);

    // Build update object
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (location !== undefined) updateData.location = location;
    if (event_type !== undefined) updateData.event_type = event_type;
    if (max_participants !== undefined) updateData.max_participants = parseInt(max_participants);
    if (status !== undefined) updateData.status = status;

    updateData.updated_at = new Date().toISOString();

    // Validate dates if both are provided
    if (updateData.start_date && updateData.end_date) {
      if (new Date(updateData.end_date) <= new Date(updateData.start_date)) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }

    const { data, error } = await supabaseService.client
      .from('community_events')
      .update(updateData)
      .eq('id', eventId)
      .select('*')
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    console.log('✅ Event updated:', data.id);

    res.json({
      success: true,
      data,
      message: 'Event updated successfully'
    });

  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event',
      error: error.message
    });
  }
});

// DELETE event
router.delete('/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;

    console.log('📅 Deleting event:', eventId);

    const { data, error } = await supabaseService.client
      .from('community_events')
      .delete()
      .eq('id', eventId)
      .select('*')
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    console.log('✅ Event deleted:', data.id);

    res.json({
      success: true,
      data,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: error.message
    });
  }
});

// DELETE event for a specific community (frontend uses this route)
router.delete('/communities/:communityId/events/:eventId', async (req, res) => {
  try {
    const { communityId, eventId } = req.params;

    console.log('📅 Deleting event:', eventId, 'from community:', communityId);

    // Verify the event belongs to the community before deleting
    const { data: existingEvent, error: checkError } = await supabaseService.client
      .from('community_events')
      .select('*')
      .eq('id', eventId)
      .eq('community_id', communityId)
      .single();

    if (checkError || !existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Event not found in this community'
      });
    }

    const { data, error } = await supabaseService.client
      .from('community_events')
      .delete()
      .eq('id', eventId)
      .eq('community_id', communityId)
      .select('*')
      .single();

    if (error) throw error;

    console.log('✅ Event deleted:', data.id);

    res.json({
      success: true,
      data,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: error.message
    });
  }
});

// POST register for event
router.post('/events/:id/register', async (req, res) => {
  try {
    const eventId = req.params.id;
    const { user_id, user_name, user_email } = req.body;

    console.log('📅 Registering for event:', eventId);

    if (!user_id && !user_email) {
      return res.status(400).json({
        success: false,
        message: 'Either user_id or user_email is required'
      });
    }

    // Validate event ID format
    if (!eventId || eventId.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    // Get current event
    const { data: event, error: eventError } = await supabaseService.client
      .from('community_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if event is active
    if (event.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Event is not available for registration'
      });
    }

    // Check if event is full
    if (event.current_participants >= event.max_participants) {
      return res.status(400).json({
        success: false,
        message: 'Event is full'
      });
    }

    // Check if event has already started
    if (new Date(event.start_date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot register for past events'
      });
    }

    // Update participant count
    const { error: updateError } = await supabaseService.client
      .from('community_events')
      .update({
        current_participants: event.current_participants + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId);

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Successfully registered for event',
      data: {
        event_id: eventId,
        user_id,
        user_name: user_name || null,
        user_email: user_email || null,
        registered_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register for event',
      error: error.message
    });
  }
});

// GET event statistics
router.get('/communities/:id/events/stats', async (req, res) => {
  try {
    const communityId = req.params.id;

    console.log('📊 Fetching event stats for community:', communityId);

    const { data: events, error } = await supabaseService.client
      .from('community_events')
      .select('*')
      .eq('community_id', communityId);

    if (error) throw error;

    const now = new Date();
    const stats = {
      total: events.length,
      upcoming: events.filter(e => new Date(e.start_date) > now).length,
      past: events.filter(e => new Date(e.start_date) < now).length,
      published: events.filter(e => e.status === 'published').length,
      draft: events.filter(e => e.status === 'draft').length,
      cancelled: events.filter(e => e.status === 'cancelled').length,
      total_participants: events.reduce((sum, e) => sum + (e.current_participants || 0), 0),
      average_attendance: events.length > 0
        ? Math.round(events.reduce((sum, e) => sum + (e.current_participants || 0), 0) / events.length)
        : 0
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching event stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event statistics',
      error: error.message
    });
  }
});

module.exports = router;