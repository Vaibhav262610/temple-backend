// Complete Volunteer Management Routes - Supabase Compatible
const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
const { body } = require('express-validator');

// =============================================
// VOLUNTEERS ROUTES
// =============================================

// GET all volunteers
router.get('/', async (req, res) => {
    try {
        const { community_id, status, skills, limit = 50, page = 1 } = req.query;

        console.log('👥 Fetching volunteers with filters:', { community_id, status, skills, limit, page });

        let query = supabaseService.client
            .from('volunteers')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply filters
        if (community_id && community_id !== 'all') {
            query = query.eq('community_id', community_id);
        }
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }
        if (skills) {
            query = query.contains('skills', [skills]);
        }

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: data || [],
            total: data?.length || 0,
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching volunteers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch volunteers',
            error: error.message
        });
    }
});

// POST create new volunteer
router.post('/', async (req, res) => {
    try {
        const {
            community_id,
            first_name,
            last_name,
            email,
            phone,
            date_of_birth,
            address,
            emergency_contact,
            skills,
            interests,
            availability,
            notes
        } = req.body;

        console.log('👥 Creating new volunteer:', { first_name, last_name, email });

        // Validate required fields
        if (!first_name || !last_name || !email || !community_id) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: first_name, last_name, email, community_id'
            });
        }

        const volunteerData = {
            community_id,
            first_name,
            last_name,
            email,
            phone: phone || '',
            date_of_birth: date_of_birth || null,
            address: address || {},
            emergency_contact: emergency_contact || {},
            skills: Array.isArray(skills) ? skills : [],
            interests: Array.isArray(interests) ? interests : [],
            availability: availability || {},
            notes: notes || '',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseService.client
            .from('volunteers')
            .insert(volunteerData)
            .select('*')
            .single();

        if (error) throw error;

        console.log('✅ Volunteer created:', data.id);

        res.status(201).json({
            success: true,
            data: data,
            message: 'Volunteer created successfully'
        });

    } catch (error) {
        console.error('Error creating volunteer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create volunteer',
            error: error.message
        });
    }
});

// PUT update volunteer
router.put('/:id', async (req, res) => {
    try {
        const volunteerId = req.params.id;
        const updateData = { ...req.body };
        updateData.updated_at = new Date().toISOString();

        console.log('👥 Updating volunteer:', volunteerId);

        const { data, error } = await supabaseService.client
            .from('volunteers')
            .update(updateData)
            .eq('id', volunteerId)
            .select('*')
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Volunteer not found'
            });
        }

        console.log('✅ Volunteer updated:', data.id);

        res.json({
            success: true,
            data: data,
            message: 'Volunteer updated successfully'
        });

    } catch (error) {
        console.error('Error updating volunteer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update volunteer',
            error: error.message
        });
    }
});

// =============================================
// VOLUNTEER APPLICATIONS ROUTES
// =============================================

// GET all applications
router.get('/applications', async (req, res) => {
    try {
        const { community_id, status, limit = 50, page = 1 } = req.query;

        console.log('📝 Fetching applications with filters:', { community_id, status, limit, page });

        let query = supabaseService.client
            .from('volunteer_applications')
            .select('*')
            .order('applied_at', { ascending: false });

        // Apply filters
        if (community_id && community_id !== 'all') {
            query = query.eq('community_id', community_id);
        }
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: data || [],
            total: data?.length || 0,
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch applications',
            error: error.message
        });
    }
});

// POST create new application
router.post('/applications', async (req, res) => {
    try {
        const applicationData = {
            ...req.body,
            status: 'pending',
            applied_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseService.client
            .from('volunteer_applications')
            .insert(applicationData)
            .select('*')
            .single();

        if (error) throw error;

        console.log('✅ Application created:', data.id);

        res.status(201).json({
            success: true,
            data: data,
            message: 'Application submitted successfully'
        });

    } catch (error) {
        console.error('Error creating application:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit application',
            error: error.message
        });
    }
});

// PUT approve/reject application
router.put('/applications/:id/review', async (req, res) => {
    try {
        const applicationId = req.params.id;
        const { status, review_notes } = req.body;

        console.log('📝 Reviewing application:', applicationId, status);

        const updateData = {
            status,
            review_notes: review_notes || '',
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseService.client
            .from('volunteer_applications')
            .update(updateData)
            .eq('id', applicationId)
            .select('*')
            .single();

        if (error) throw error;

        // If approved, create volunteer record
        if (status === 'approved') {
            const volunteerData = {
                community_id: data.community_id,
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                phone: data.phone,
                date_of_birth: data.date_of_birth,
                address: data.address,
                emergency_contact: data.emergency_contact,
                skills: data.skills,
                interests: data.interests,
                availability: data.availability,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: volunteerRecord, error: volunteerError } = await supabaseService.client
                .from('volunteers')
                .insert(volunteerData)
                .select('*')
                .single();

            if (volunteerError) {
                console.error('Error creating volunteer from application:', volunteerError);
            } else {
                console.log('✅ Volunteer created from application:', volunteerRecord.id);
            }
        }

        res.json({
            success: true,
            data: data,
            message: `Application ${status} successfully`
        });

    } catch (error) {
        console.error('Error reviewing application:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to review application',
            error: error.message
        });
    }
});

// =============================================
// SHIFTS ROUTES
// =============================================

// GET all shifts
router.get('/shifts', async (req, res) => {
    try {
        const { community_id, status, date, limit = 50, page = 1 } = req.query;

        console.log('📅 Fetching shifts with filters:', { community_id, status, date, limit, page });

        let query = supabaseService.client
            .from('volunteer_shifts')
            .select('*')
            .order('shift_date', { ascending: true });

        // Apply filters
        if (community_id && community_id !== 'all') {
            query = query.eq('community_id', community_id);
        }
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }
        if (date) {
            query = query.eq('shift_date', date);
        }

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: data || [],
            total: data?.length || 0,
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching shifts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch shifts',
            error: error.message
        });
    }
});

// POST create new shift
router.post('/shifts', async (req, res) => {
    try {
        const shiftData = {
            ...req.body,
            status: 'open',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseService.client
            .from('volunteer_shifts')
            .insert(shiftData)
            .select('*')
            .single();

        if (error) throw error;

        console.log('✅ Shift created:', data.id);

        res.status(201).json({
            success: true,
            data: data,
            message: 'Shift created successfully'
        });

    } catch (error) {
        console.error('Error creating shift:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create shift',
            error: error.message
        });
    }
});

// =============================================
// ATTENDANCE ROUTES
// =============================================

// GET attendance records
router.get('/attendance', async (req, res) => {
    try {
        const { volunteer_id, shift_id, date, limit = 50, page = 1 } = req.query;

        console.log('📊 Fetching attendance with filters:', { volunteer_id, shift_id, date, limit, page });

        let query = supabaseService.client
            .from('volunteer_attendance')
            .select(`
        *,
        volunteers:volunteer_id (
          first_name,
          last_name,
          email
        ),
        volunteer_shifts:shift_id (
          title,
          shift_date,
          start_time,
          end_time
        )
      `)
            .order('created_at', { ascending: false });

        // Apply filters
        if (volunteer_id) {
            query = query.eq('volunteer_id', volunteer_id);
        }
        if (shift_id) {
            query = query.eq('shift_id', shift_id);
        }

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: data || [],
            total: data?.length || 0,
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch attendance',
            error: error.message
        });
    }
});

// POST check-in volunteer
router.post('/attendance/checkin', async (req, res) => {
    try {
        const { shift_assignment_id, volunteer_id, shift_id } = req.body;

        console.log('✅ Checking in volunteer:', volunteer_id, 'for shift:', shift_id);

        const attendanceData = {
            shift_assignment_id,
            volunteer_id,
            shift_id,
            check_in_time: new Date().toISOString(),
            status: 'checked_in',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseService.client
            .from('volunteer_attendance')
            .insert(attendanceData)
            .select('*')
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            data: data,
            message: 'Volunteer checked in successfully'
        });

    } catch (error) {
        console.error('Error checking in volunteer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check in volunteer',
            error: error.message
        });
    }
});

// PUT check-out volunteer
router.put('/attendance/:id/checkout', async (req, res) => {
    try {
        const attendanceId = req.params.id;
        const checkOutTime = new Date().toISOString();

        console.log('⏰ Checking out volunteer for attendance:', attendanceId);

        // Get the attendance record to calculate hours
        const { data: attendance, error: fetchError } = await supabaseService.client
            .from('volunteer_attendance')
            .select('*')
            .eq('id', attendanceId)
            .single();

        if (fetchError) throw fetchError;

        // Calculate hours worked
        const checkInTime = new Date(attendance.check_in_time);
        const checkOutTimeDate = new Date(checkOutTime);
        const hoursWorked = (checkOutTimeDate - checkInTime) / (1000 * 60 * 60);

        const updateData = {
            check_out_time: checkOutTime,
            hours_worked: Math.round(hoursWorked * 100) / 100, // Round to 2 decimal places
            status: 'completed',
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseService.client
            .from('volunteer_attendance')
            .update(updateData)
            .eq('id', attendanceId)
            .select('*')
            .single();

        if (error) throw error;

        // Update volunteer's total hours
        const { error: updateVolunteerError } = await supabaseService.client
            .rpc('increment_volunteer_hours', {
                volunteer_id: attendance.volunteer_id,
                hours_to_add: updateData.hours_worked
            });

        if (updateVolunteerError) {
            console.error('Error updating volunteer hours:', updateVolunteerError);
        }

        res.json({
            success: true,
            data: data,
            message: 'Volunteer checked out successfully'
        });

    } catch (error) {
        console.error('Error checking out volunteer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check out volunteer',
            error: error.message
        });
    }
});

module.exports = router;