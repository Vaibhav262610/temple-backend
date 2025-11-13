// Simple Volunteer Routes - Working Version
const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');

// GET all volunteers
router.get('/', async (req, res) => {
    try {
        const { community_id, status, limit = 50, page = 1 } = req.query;

        console.log('👥 Fetching volunteers with filters:', { community_id, status, limit, page });

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
        if (!first_name || !last_name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: first_name, last_name, email'
            });
        }

        const volunteerData = {
            community_id: community_id || null,
            first_name,
            last_name,
            email,
            phone: phone || '',
            skills: Array.isArray(skills) ? skills : [],
            interests: Array.isArray(interests) ? interests : [],
            notes: notes || '',
            status: 'active',
            total_hours_volunteered: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // TODO: Add these fields after running the database migration:
        // date_of_birth: date_of_birth || null,
        // address: address || {},
        // emergency_contact: emergency_contact || {},
        // availability: availability || {},

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

// DELETE volunteer
router.delete('/:id', async (req, res) => {
    try {
        const volunteerId = req.params.id;

        console.log('👥 Deleting volunteer:', volunteerId);

        const { data, error } = await supabaseService.client
            .from('volunteers')
            .delete()
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

        console.log('✅ Volunteer deleted:', data.id);

        res.json({
            success: true,
            data: data,
            message: 'Volunteer deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting volunteer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete volunteer',
            error: error.message
        });
    }
});

// =============================================
// VOLUNTEER SHIFTS ROUTES
// =============================================

// GET all volunteer shifts
router.get('/shifts', async (req, res) => {
    try {
        const { community_id, status, date, limit = 50, page = 1 } = req.query;

        console.log('📅 Fetching volunteer shifts with filters:', { community_id, status, date, limit, page });

        let query = supabaseService.client
            .from('volunteer_shifts')
            .select('*')
            .order('created_at', { ascending: false });

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
        console.error('Error fetching volunteer shifts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch volunteer shifts',
            error: error.message
        });
    }
});

// POST create new volunteer shift
router.post('/shifts', async (req, res) => {
    try {
        const {
            community_id,
            title,
            description,
            location,
            shift_date,
            start_time,
            end_time,
            required_volunteers,
            skills_required
        } = req.body;

        console.log('📅 Creating new volunteer shift:', { title, shift_date, location });

        // Validate required fields
        if (!title || !shift_date || !start_time || !end_time) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: title, shift_date, start_time, end_time'
            });
        }

        const shiftData = {
            community_id: community_id || null,
            title,
            description: description || '',
            location: location || '',
            shift_date,
            start_time,
            end_time,
            required_volunteers: parseInt(required_volunteers) || 1,
            skills_required: Array.isArray(skills_required) ? skills_required : [],
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

        console.log('✅ Volunteer shift created:', data.id);

        res.status(201).json({
            success: true,
            data: data,
            message: 'Volunteer shift created successfully'
        });

    } catch (error) {
        console.error('Error creating volunteer shift:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create volunteer shift',
            error: error.message
        });
    }
});

// PUT update volunteer shift
router.put('/shifts/:id', async (req, res) => {
    try {
        const shiftId = req.params.id;
        const updateData = { ...req.body };
        updateData.updated_at = new Date().toISOString();

        console.log('📅 Updating volunteer shift:', shiftId);

        const { data, error } = await supabaseService.client
            .from('volunteer_shifts')
            .update(updateData)
            .eq('id', shiftId)
            .select('*')
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Volunteer shift not found'
            });
        }

        console.log('✅ Volunteer shift updated:', data.id);

        res.json({
            success: true,
            data: data,
            message: 'Volunteer shift updated successfully'
        });

    } catch (error) {
        console.error('Error updating volunteer shift:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update volunteer shift',
            error: error.message
        });
    }
});

// DELETE volunteer shift
router.delete('/shifts/:id', async (req, res) => {
    try {
        const shiftId = req.params.id;

        console.log('📅 Deleting volunteer shift:', shiftId);

        const { data, error } = await supabaseService.client
            .from('volunteer_shifts')
            .delete()
            .eq('id', shiftId)
            .select('*')
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Volunteer shift not found'
            });
        }

        console.log('✅ Volunteer shift deleted:', data.id);

        res.json({
            success: true,
            data: data,
            message: 'Volunteer shift deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting volunteer shift:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete volunteer shift',
            error: error.message
        });
    }
});

// =============================================
// VOLUNTEER ATTENDANCE ROUTES
// =============================================

// GET volunteer attendance records
router.get('/attendance', async (req, res) => {
    try {
        const { volunteer_id, shift_id, date, limit = 50, page = 1 } = req.query;

        console.log('📊 Fetching attendance with filters:', { volunteer_id, shift_id, date, limit, page });

        let query = supabaseService.client
            .from('volunteer_attendance')
            .select(`
                *,
                volunteers:volunteer_id (
                    id,
                    first_name,
                    last_name,
                    email
                ),
                volunteer_shifts:shift_id (
                    id,
                    title,
                    shift_date,
                    start_time,
                    end_time,
                    location
                )
            `)
            .order('created_at', { ascending: false });

        // Apply filters
        if (volunteer_id && volunteer_id !== 'all') {
            query = query.eq('volunteer_id', volunteer_id);
        }
        if (shift_id && shift_id !== 'all') {
            query = query.eq('shift_id', shift_id);
        }
        if (date) {
            // Filter by shift date through the volunteer_shifts relation
            query = query.eq('volunteer_shifts.shift_date', date);
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

// POST create attendance record (for manual marking)
router.post('/attendance', async (req, res) => {
    try {
        const { volunteer_id, shift_id, status, check_in_time, check_out_time, notes } = req.body;

        console.log('📝 Creating attendance record:', { volunteer_id, shift_id, status });

        // Validate required fields
        if (!volunteer_id || !shift_id || !status) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: volunteer_id, shift_id, status'
            });
        }

        // Create a dummy shift assignment first, then attendance
        // For now, we'll create a simple attendance record without assignment
        // This is a simplified approach - in production you'd want proper shift assignments

        const attendanceData = {
            volunteer_id,
            shift_id,
            status,
            check_in_time: check_in_time || null,
            check_out_time: check_out_time || null,
            notes: notes || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseService.client
            .from('volunteer_attendance')
            .insert(attendanceData)
            .select('*')
            .single();

        if (error) throw error;

        console.log('✅ Attendance record created:', data.id);

        res.status(201).json({
            success: true,
            data: data,
            message: 'Attendance record created successfully'
        });

    } catch (error) {
        console.error('Error creating attendance record:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create attendance record',
            error: error.message
        });
    }
});

// PUT update attendance status
router.put('/attendance/:id', async (req, res) => {
    try {
        const attendanceId = req.params.id;
        const { status, check_in_time, check_out_time, notes } = req.body;

        console.log('📝 Updating attendance:', attendanceId, 'status:', status);

        const updateData = {
            status,
            notes: notes || '',
            updated_at: new Date().toISOString()
        };

        if (check_in_time) updateData.check_in_time = check_in_time;
        if (check_out_time) updateData.check_out_time = check_out_time;

        const { data, error } = await supabaseService.client
            .from('volunteer_attendance')
            .update(updateData)
            .eq('id', attendanceId)
            .select('*')
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        console.log('✅ Attendance updated:', data.id);

        res.json({
            success: true,
            data: data,
            message: 'Attendance updated successfully'
        });

    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update attendance',
            error: error.message
        });
    }
});

// POST check-in volunteer
router.post('/attendance/checkin', async (req, res) => {
    try {
        const { volunteer_id, shift_id, notes } = req.body;

        console.log('✅ Checking in volunteer:', volunteer_id, 'for shift:', shift_id);

        // Validate required fields
        if (!volunteer_id || !shift_id) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: volunteer_id, shift_id'
            });
        }

        const attendanceData = {
            volunteer_id,
            shift_id,
            check_in_time: new Date().toISOString(),
            status: 'present',
            notes: notes || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseService.client
            .from('volunteer_attendance')
            .insert(attendanceData)
            .select('*')
            .single();

        if (error) throw error;

        console.log('✅ Volunteer checked in:', data.id);

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
        const { notes } = req.body;

        console.log('⏰ Checking out volunteer attendance:', attendanceId);

        const updateData = {
            check_out_time: new Date().toISOString(),
            status: 'completed',
            notes: notes || '',
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseService.client
            .from('volunteer_attendance')
            .update(updateData)
            .eq('id', attendanceId)
            .select('*')
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        console.log('✅ Volunteer checked out:', data.id);

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

// =============================================
// VOLUNTEER APPLICATIONS ROUTES
// =============================================

// GET all volunteer applications
router.get('/applications', async (req, res) => {
    try {
        const { community_id, status, limit = 50, page = 1 } = req.query;

        console.log('📝 Fetching volunteer applications with filters:', { community_id, status, limit, page });

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

        if (error) {
            console.error('Supabase error:', error);

            // If table doesn't exist, return empty data instead of failing
            if (error.message.includes('volunteer_applications') || error.message.includes('relation')) {
                console.log('⚠️ Volunteer applications table not found, returning empty data');
                return res.json({
                    success: true,
                    data: [],
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: 0,
                        totalPages: 0
                    },
                    message: 'Volunteer applications table not found. Please apply database schema.'
                });
            }

            throw error;
        }

        console.log('✅ Found', data?.length || 0, 'volunteer applications');

        res.json({
            success: true,
            data: data || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: data?.length || 0,
                totalPages: Math.ceil((data?.length || 0) / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching volunteer applications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch volunteer applications',
            error: error.message
        });
    }
});

// POST create new volunteer application
router.post('/applications', async (req, res) => {
    try {
        const {
            community_id,
            first_name,
            last_name,
            email,
            phone,
            skills,
            interests,
            motivation,
            experience,
            user_id
        } = req.body;

        console.log('📝 Creating volunteer application:', { first_name, last_name, email });

        // Validate required fields
        if (!first_name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: first_name, email, phone'
            });
        }

        const applicationData = {
            community_id: community_id || null,
            first_name,
            last_name: last_name || '',
            email,
            phone,
            skills: Array.isArray(skills) ? skills : [],
            interests: Array.isArray(interests) ? interests : [],
            motivation: motivation || '',
            experience: experience || '',
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

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('✅ Volunteer application created:', data.id);

        res.status(201).json({
            success: true,
            data: data,
            message: 'Volunteer application submitted successfully'
        });

    } catch (error) {
        console.error('Error creating volunteer application:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit volunteer application',
            error: error.message
        });
    }
});

// PUT approve volunteer application
router.put('/applications/:id/approve', async (req, res) => {
    try {
        const applicationId = req.params.id;
        const { reviewed_by, notes } = req.body;

        console.log('✅ Approving volunteer application:', applicationId);

        // First, update the application status
        const { data: application, error: updateError } = await supabaseService.client
            .from('volunteer_applications')
            .update({
                status: 'approved',
                reviewed_at: new Date().toISOString(),
                reviewed_by: null, // TODO: Use actual user UUID when auth is implemented
                review_notes: notes || '',
                updated_at: new Date().toISOString()
            })
            .eq('id', applicationId)
            .select('*')
            .single();

        if (updateError) throw updateError;

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Volunteer application not found'
            });
        }

        // Create volunteer record from approved application
        console.log('👥 Creating volunteer record from approved application...');

        const volunteerData = {
            community_id: application.community_id,
            first_name: application.first_name,
            last_name: application.last_name,
            email: application.email,
            phone: application.phone,
            skills: application.skills || [],
            interests: application.interests || [],
            status: 'active',
            total_hours_volunteered: 0,
            notes: `Approved from application: ${application.motivation || application.experience || 'Application approved'}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // TODO: Add these fields after running database migration to add columns:
        // date_of_birth: application.date_of_birth || null,
        // address: application.address || {},
        // emergency_contact: application.emergency_contact || {},
        // availability: application.availability || {},

        const { data: volunteer, error: volunteerError } = await supabaseService.client
            .from('volunteers')
            .insert(volunteerData)
            .select('*')
            .single();

        if (volunteerError) {
            console.error('❌ Error creating volunteer record:', volunteerError);
            console.error('❌ Error details:', {
                message: volunteerError.message,
                details: volunteerError.details,
                hint: volunteerError.hint,
                code: volunteerError.code
            });
            console.error('❌ Volunteer data that failed:', volunteerData);
            // Don't fail the approval if volunteer creation fails
            console.log('⚠️ Application approved but volunteer record creation failed');
        } else {
            console.log('✅ Volunteer record created:', volunteer.id);
        }

        res.json({
            success: true,
            data: application,
            volunteer: volunteer || null,
            message: 'Volunteer application approved successfully'
        });

    } catch (error) {
        console.error('Error approving volunteer application:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve volunteer application',
            error: error.message
        });
    }
});

// PUT reject volunteer application
router.put('/applications/:id/reject', async (req, res) => {
    try {
        const applicationId = req.params.id;
        const { reviewed_by, rejection_reason, notes } = req.body;

        console.log('❌ Rejecting volunteer application:', applicationId);

        const { data, error } = await supabaseService.client
            .from('volunteer_applications')
            .update({
                status: 'rejected',
                reviewed_at: new Date().toISOString(),
                reviewed_by: null, // TODO: Use actual user UUID when auth is implemented
                review_notes: notes || rejection_reason || 'Application rejected',
                updated_at: new Date().toISOString()
            })
            .eq('id', applicationId)
            .select('*')
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Volunteer application not found'
            });
        }

        console.log('✅ Volunteer application rejected:', data.id);

        res.json({
            success: true,
            data: data,
            message: 'Volunteer application rejected'
        });

    } catch (error) {
        console.error('Error rejecting volunteer application:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject volunteer application',
            error: error.message
        });
    }
});

// PUT update application status (for under-review, interview scheduling, etc.)
router.put('/applications/:id/status', async (req, res) => {
    try {
        const applicationId = req.params.id;
        const { status, notes, interview_date, background_check } = req.body;

        console.log('📝 Updating volunteer application status:', applicationId, 'to:', status);

        const updateData = {
            status,
            review_notes: notes || '',
            updated_at: new Date().toISOString()
        };

        if (interview_date) {
            updateData.interview_scheduled = true;
            updateData.interview_date = interview_date;
        }

        if (background_check) {
            updateData.background_check = background_check;
        }

        const { data, error } = await supabaseService.client
            .from('volunteer_applications')
            .update(updateData)
            .eq('id', applicationId)
            .select('*')
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Volunteer application not found'
            });
        }

        console.log('✅ Volunteer application status updated:', data.id);

        res.json({
            success: true,
            data: data,
            message: 'Volunteer application updated successfully'
        });

    } catch (error) {
        console.error('Error updating volunteer application:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update volunteer application',
            error: error.message
        });
    }
});

module.exports = router;