// backend/routes/communityFeatures.js - SUPABASE ENHANCED VERSION
const express = require('express');
const router = express.Router();
const CommunityMember = require('../models/CommunityMember');
const CommunityApplication = require('../models/CommunityApplication');
const CommunityTask = require('../models/CommunityTask');
const CommunityEvent = require('../models/CommunityEvent');
const Community = require('../models/Community');
const supabaseService = require('../services/supabaseService');

// ===== MEMBERS ROUTES =====
router.get('/:id/members', async (req, res) => {
  try {
    const { id: communityId } = req.params;
    const { role, status = 'active', search } = req.query;

    console.log('📋 Fetching members for community:', communityId);

    // Always use approved applications as members since they have complete user data
    let members = [];
    let memberSource = 'approved_applications';

    console.log('👥 Using approved applications as members (primary method)');

    const { data: approvedApplications, error: appsError } = await supabaseService.client
      .from('community_applications')
      .select('*')
      .eq('community_id', communityId)
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false });

    if (appsError) {
      console.error('❌ Approved applications query error:', appsError);
      throw appsError;
    }

    // Convert approved applications to member format with complete user data
    members = (approvedApplications || []).map(app => ({
      id: app.id,
      community_id: app.community_id,
      user_id: app.user_id,
      full_name: app.name,
      email: app.email,
      phone: app.phone,
      role: 'member',
      status: 'active',
      joined_at: app.reviewed_at || app.applied_at,
      is_lead: false,
      skills: app.skills || [],
      experience: app.experience || null
    }));

    memberSource = 'approved_applications';
    console.log('✅ Members loaded from approved applications:', members.length);

    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      members = members.filter(m =>
        m.full_name?.toLowerCase().includes(searchLower) ||
        m.email?.toLowerCase().includes(searchLower)
      );
    }

    console.log('✅ Final members count:', members.length, 'from', memberSource);

    res.json({
      success: true,
      data: members,
      total: members.length,
      source: memberSource // For debugging
    });
  } catch (error) {
    console.error('❌ Error fetching members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch members',
      error: error.message
    });
  }
});

router.post('/:id/members', async (req, res) => {
  try {
    const { id: communityId } = req.params;
    const { user_id, role = 'member', email, full_name } = req.body;

    console.log('🚀 MEMBER CREATION ROUTE CALLED');
    console.log('👥 Adding member to community:', communityId);
    console.log('📝 Member data:', { user_id, role, email, full_name });

    // Check if user already exists as member
    console.log('🔍 Checking if user already exists...');
    const { data: existing, error: checkError } = await supabaseService.client
      .from('community_members')
      .select('*')
      .eq('community_id', communityId)
      .eq('user_id', user_id)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking existing member:', checkError);
    }

    console.log('📊 Existing member check result:', existing ? 'Found existing' : 'No existing member');

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member'
      });
    }

    // Create member record
    console.log('📝 Creating member record...');
    const memberData = {
      community_id: communityId,
      user_id,
      role,
      status: 'active',
      joined_at: new Date().toISOString()
    };

    console.log('📤 Inserting member data:', memberData);

    const { data: member, error } = await supabaseService.client
      .from('community_members')
      .insert(memberData)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Supabase member creation error:', error);
      throw error;
    }

    console.log('✅ Member created successfully:', member.id);

    // Update community member count (get current count and increment)
    const { data: community } = await supabaseService.client
      .from('communities')
      .select('member_count')
      .eq('id', communityId)
      .single();

    const newMemberCount = (community?.member_count || 0) + 1;

    await supabaseService.client
      .from('communities')
      .update({
        member_count: newMemberCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', communityId);

    console.log('✅ Member added successfully:', member.id);

    res.status(201).json({
      success: true,
      data: member,
      message: 'Member added successfully'
    });
  } catch (error) {
    console.error('❌ Error adding member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add member',
      error: error.message
    });
  }
});

router.put('/:id/members/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { role, is_lead, lead_position } = req.body;

    const updateData = { updated_at: new Date() };
    if (role) updateData.role = role;
    if (is_lead !== undefined) {
      updateData.is_lead = is_lead;
      if (!is_lead) updateData.lead_position = '';
    }
    if (lead_position) updateData.lead_position = lead_position;

    const member = await CommunityMember.findByIdAndUpdate(
      memberId,
      updateData,
      { new: true }
    ).populate('user_id', 'full_name email avatar_url');

    res.json({
      success: true,
      data: member,
      message: 'Member updated successfully'
    });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update member',
      error: error.message
    });
  }
});

router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    const { id: communityId, memberId } = req.params;

    await CommunityMember.findByIdAndDelete(memberId);
    await Community.findByIdAndUpdate(communityId, {
      $inc: { member_count: -1 }
    });

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member',
      error: error.message
    });
  }
});

router.post('/:id/members/email', async (req, res) => {
  try {
    const { subject, message, send_to_all } = req.body;

    res.json({
      success: true,
      message: 'Email sending feature coming soon',
      sent_count: 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
});

router.get('/:id/leads', async (req, res) => {
  try {
    const { id: communityId } = req.params;

    const leads = await CommunityMember.find({
      community_id: communityId,
      is_lead: true,
      status: 'active'
    })
      .populate('user_id', 'full_name email avatar_url phone')
      .sort({ lead_position: 1 });

    res.json({
      success: true,
      data: leads
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads',
      error: error.message
    });
  }
});

// ===== APPLICATIONS ROUTES =====
router.get('/:id/applications', async (req, res) => {
  try {
    const { id: communityId } = req.params;
    const { status = 'all' } = req.query;

    console.log('📋 Fetching applications for community:', communityId);

    let query = supabaseService.client
      .from('community_applications')
      .select(`
        *,
        user:users!community_applications_user_id_fkey (
          id,
          full_name,
          email,
          avatar_url,
          phone
        )
      `)
      .eq('community_id', communityId);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: applications, error } = await query.order('applied_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase applications query error:', error);
      throw error;
    }

    console.log('✅ Applications fetched:', applications?.length || 0);

    res.json({
      success: true,
      data: applications || [],
      total: applications?.length || 0
    });
  } catch (error) {
    console.error('❌ Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
});

router.post('/:id/applications', async (req, res) => {
  try {
    const { id: communityId } = req.params;
    const { name, email, phone, message, why_join, skills, experience, user_id } = req.body;

    console.log('📝 Creating application for community:', communityId);

    const applicationData = {
      community_id: communityId,
      user_id: user_id || null,
      name,
      email,
      phone,
      message,
      why_join,
      skills: skills || [],
      experience,
      status: 'pending',
      applied_at: new Date().toISOString()
    };

    const { data: application, error } = await supabaseService.client
      .from('community_applications')
      .insert(applicationData)
      .select(`
        *,
        user:users!community_applications_user_id_fkey (
          id,
          full_name,
          email,
          avatar_url,
          phone
        )
      `)
      .single();

    if (error) {
      console.error('❌ Supabase application creation error:', error);
      throw error;
    }

    console.log('✅ Application created successfully:', application.id);

    res.status(201).json({
      success: true,
      data: application,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('❌ Error creating application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: error.message
    });
  }
});

router.put('/:id/applications/:applicationId/approve', async (req, res) => {
  try {
    const { id: communityId, applicationId } = req.params;
    const { reviewed_by } = req.body;

    console.log('📋 Approving application via communityFeatures:', applicationId);

    if (applicationId === 'undefined' || applicationId === 'null' || !applicationId || applicationId.trim() === '') {
      console.log('❌ Invalid application ID received for approval:', applicationId);
      return res.status(400).json({
        success: false,
        error: 'Invalid application ID',
        message: `Invalid application ID received: "${applicationId}". Please ensure the application ID is properly set in the frontend.`,
        received_id: applicationId,
        hint: 'Check that the application object has a valid "id" property'
      });
    }

    // Update application status in Supabase
    const { data, error } = await supabaseService.client
      .from('community_applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewed_by || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select('*')
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // ONLY APPROVED APPLICATIONS: Add user to community_members table
    console.log('👥 APPROVED APPLICATION: Adding to community_members table...');
    console.log('📝 Application data:', {
      id: data.id,
      name: data.name,
      email: data.email,
      status: data.status,
      community_id: communityId
    });

    try {
      // Method 1: Try direct insertion with all available fields
      console.log('🔄 Method 1: Direct insertion with full data...');

      const memberData = {
        community_id: communityId,
        user_id: data.user_id || null,
        email: data.email,
        full_name: data.name,
        phone: data.phone || null,
        role: 'member',
        status: 'active',
        joined_at: new Date().toISOString(),
        is_lead: false,
        skills: data.skills || [],
        experience: data.experience || null
      };

      console.log('📤 Inserting member data:', memberData);

      const { data: memberResult, error: memberError } = await supabaseService.client
        .from('community_members')
        .insert(memberData)
        .select('*')
        .single();

      if (memberError) {
        console.error('❌ Direct insertion failed:', memberError);

        // Method 2: Try with minimal required fields only
        console.log('🔄 Method 2: Minimal fields insertion...');
        try {
          const minimalData = {
            community_id: communityId,
            user_id: data.user_id || null
          };

          const { data: minimalResult, error: minimalError } = await supabaseService.client
            .from('community_members')
            .insert(minimalData)
            .select('*')
            .single();

          if (minimalError) {
            console.error('❌ Minimal insertion also failed:', minimalError);
            console.log('💡 Will use approved applications as members (fallback system)');
          } else {
            console.log('✅ Minimal insertion successful, updating with full data...');

            // Try to update with additional fields
            const updateData = {
              email: data.email,
              full_name: data.name,
              phone: data.phone,
              role: 'member',
              status: 'active',
              joined_at: new Date().toISOString(),
              skills: data.skills,
              experience: data.experience
            };

            await supabaseService.client
              .from('community_members')
              .update(updateData)
              .eq('id', minimalResult.id);

            console.log('✅ Member data updated successfully');
          }
        } catch (minimalException) {
          console.error('❌ Minimal insertion exception:', minimalException);
        }
      } else {
        console.log('✅ APPROVED APPLICATION SUCCESSFULLY ADDED TO COMMUNITY_MEMBERS!');
        console.log('📋 New member ID:', memberResult.id);
        console.log('👤 Member details:', {
          name: memberResult.full_name || memberResult.name,
          email: memberResult.email,
          role: memberResult.role,
          status: memberResult.status
        });
      }

      // Update community member count regardless
      try {
        const { data: community } = await supabaseService.client
          .from('communities')
          .select('member_count')
          .eq('id', communityId)
          .single();

        const newMemberCount = (community?.member_count || 0) + 1;

        await supabaseService.client
          .from('communities')
          .update({
            member_count: newMemberCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', communityId);

        console.log('✅ Community member count updated to:', newMemberCount);
      } catch (countError) {
        console.error('❌ Failed to update member count:', countError);
      }

    } catch (memberException) {
      console.error('❌ Exception in member addition process:', memberException);
      console.log('💡 System will continue using approved applications as members');
    }

    console.log('✅ Application approved successfully via communityFeatures:', applicationId);

    res.json({
      success: true,
      data,
      message: 'Application approved successfully'
    });
  } catch (error) {
    console.error('Error in communityFeatures approve:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve application',
      error: error.message
    });
  }
});

router.put('/:id/applications/:applicationId/reject', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { reviewed_by, review_notes } = req.body;

    console.log('📋 Rejecting application via communityFeatures:', applicationId);

    if (applicationId === 'undefined' || applicationId === 'null' || !applicationId || applicationId.trim() === '') {
      console.log('❌ Invalid application ID received for rejection:', applicationId);
      return res.status(400).json({
        success: false,
        error: 'Invalid application ID',
        message: `Invalid application ID received: "${applicationId}". Please ensure the application ID is properly set in the frontend.`,
        received_id: applicationId,
        hint: 'Check that the application object has a valid "id" property'
      });
    }

    // Get application data first
    const { data: applicationData, error: fetchError } = await supabaseService.client
      .from('community_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError) throw fetchError;

    if (!applicationData) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // If application was previously approved, remove from community_members
    if (applicationData.status === 'approved') {
      try {
        console.log('🗑️ Removing user from community_members (was previously approved)...');

        const { data: deletedMember, error: deleteError } = await supabaseService.client
          .from('community_members')
          .delete()
          .eq('community_id', applicationData.community_id)
          .eq('email', applicationData.email)
          .select('*')
          .maybeSingle();

        if (deleteError) {
          console.error('❌ Failed to remove from community_members:', deleteError);
        } else if (deletedMember) {
          console.log('✅ User removed from community_members:', deletedMember.id);

          // Update community member count
          const { data: community } = await supabaseService.client
            .from('communities')
            .select('member_count')
            .eq('id', applicationData.community_id)
            .single();

          const newMemberCount = Math.max(0, (community?.member_count || 1) - 1);

          await supabaseService.client
            .from('communities')
            .update({
              member_count: newMemberCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', applicationData.community_id);

          console.log('✅ Community member count updated to:', newMemberCount);
        }
      } catch (memberException) {
        console.error('❌ Exception removing member:', memberException);
      }
    }

    // Update application status to rejected
    const { data, error } = await supabaseService.client
      .from('community_applications')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewed_by || null,
        review_notes: review_notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select('*')
      .single();

    if (error) throw error;

    console.log('✅ Application rejected successfully via communityFeatures:', applicationId);

    res.json({
      success: true,
      data,
      message: 'Application rejected successfully'
    });
  } catch (error) {
    console.error('Error in communityFeatures reject:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject application',
      error: error.message
    });
  }
});

// ===== TASKS ROUTES =====
router.get('/:id/tasks', async (req, res) => {
  try {
    const { id: communityId } = req.params;
    const { status, priority } = req.query;

    console.log('📋 Fetching tasks for community:', communityId);

    // Build query for Supabase (without foreign key join for now)
    let query = supabaseService.client
      .from('community_tasks')
      .select('*')
      .eq('community_id', communityId);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }

    const { data: tasks, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase tasks query error:', error);
      throw error;
    }

    console.log('✅ Tasks fetched:', tasks?.length || 0);

    res.json({
      success: true,
      data: tasks || []
    });
  } catch (error) {
    console.error('❌ Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
});

// ✅ FIXED: Task creation without created_by requirement
router.post('/:id/tasks', async (req, res) => {
  try {
    const { id: communityId } = req.params;
    const { title, description, status, priority, assigned_to, due_date, tags } = req.body;

    console.log('✅ Creating task for community:', communityId);
    console.log('📝 Task data:', { title, description, status, priority });

    // ✅ FIXED: Build task object WITHOUT created_by
    const taskData = {
      community_id: communityId,
      title,
      description,
      status: status || 'todo',
      priority: priority || 'medium',
      assigned_to: assigned_to || [],
      due_date,
      tags: tags || []
    };

    // Only add created_by if we have a valid user
    if (req.user?.id) {
      taskData.created_by = req.user.id;
    }

    const { data: task, error } = await supabaseService.client
      .from('community_tasks')
      .insert(taskData)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Supabase task creation error:', error);
      throw error;
    }

    console.log('✅ Task created successfully:', task.id);

    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.put('/:id/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;
    updates.updated_at = new Date().toISOString();

    console.log('📝 Updating task:', taskId);
    console.log('📝 Updates:', updates);

    if (updates.status === 'completed' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }

    const { data: task, error } = await supabaseService.client
      .from('community_tasks')
      .update(updates)
      .eq('id', taskId)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Supabase task update error:', error);
      throw error;
    }

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    console.log('✅ Task updated successfully:', task.id);

    res.json({
      success: true,
      data: task,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task',
      error: error.message
    });
  }
});

router.delete('/:id/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    console.log('🗑️ Deleting task:', taskId);

    const { data: task, error } = await supabaseService.client
      .from('community_tasks')
      .delete()
      .eq('id', taskId)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Supabase task delete error:', error);
      throw error;
    }

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    console.log('✅ Task deleted successfully:', task.id);

    res.json({
      success: true,
      data: task,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete task',
      error: error.message
    });
  }
});

// ===== EVENTS/CALENDAR ROUTES =====
router.get('/:id/events', async (req, res) => {
  try {
    const { id: communityId } = req.params;

    console.log('📋 Fetching events for community:', communityId);

    const { data: events, error } = await supabaseService.client
      .from('community_events')
      .select('*')
      .eq('community_id', communityId)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('❌ Supabase events query error:', error);
      // Don't throw error, just return empty array for events
      return res.json({
        success: true,
        data: []
      });
    }

    console.log('✅ Events fetched:', events?.length || 0);

    res.json({
      success: true,
      data: events || []
    });
  } catch (error) {
    console.error('❌ Error fetching events:', error);
    res.status(500).json({
      success: true,
      data: []
    });
  }
});

router.post('/:id/events', async (req, res) => {
  try {
    const { id: communityId } = req.params;
    const eventData = req.body;

    console.log('📅 Creating event for community:', communityId);

    const eventDataForSupabase = {
      community_id: communityId,
      ...eventData,
      organizer_id: req.user?.id || null,
      status: 'published'
    };

    const { data: event, error } = await supabaseService.client
      .from('community_events')
      .insert(eventDataForSupabase)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Supabase event creation error:', error);
      throw error;
    }

    console.log('✅ Event created successfully:', event.id);

    res.status(201).json({
      success: true,
      data: event,
      message: 'Event created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: error.message
    });
  }
});

router.put('/:id/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const updates = req.body;

    const event = await CommunityEvent.findByIdAndUpdate(
      eventId,
      { ...updates, updated_at: new Date() },
      { new: true }
    );

    res.json({
      success: true,
      data: event,
      message: 'Event updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update event',
      error: error.message
    });
  }
});

router.delete('/:id/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    await CommunityEvent.findByIdAndDelete(eventId);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: error.message
    });
  }
});

module.exports = router;