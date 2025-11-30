const supabaseService = require('../supabaseService');
const ActivityLogger = require('../../utils/activityLogger');

class MemberService {
  // Add member to community
  async addMember(communityId, userId, role = 'member', addedBy, memberInfo = {}) {
    // Check if member already exists by user_id or email
    let existing = null;
    if (userId) {
      const { data } = await supabaseService.client
        .from('community_members')
        .select('*')
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .single();
      existing = data;
    } else if (memberInfo.email) {
      const { data } = await supabaseService.client
        .from('community_members')
        .select('*')
        .eq('community_id', communityId)
        .eq('email', memberInfo.email)
        .single();
      existing = data;
    }

    if (existing) {
      throw new Error('User is already a member of this community');
    }

    // Prepare member data
    const memberData = {
      community_id: communityId,
      user_id: userId || null,
      role: role,
      status: 'active',
      joined_at: new Date().toISOString(),
      full_name: memberInfo.name || memberInfo.full_name || null,
      email: memberInfo.email || null,
      phone: memberInfo.phone || null
    };

    console.log('💾 Inserting member data:', memberData);

    const { data, error } = await supabaseService.client
      .from('community_members')
      .insert([memberData])
      .select(`
        *,
        user:users(id, full_name, email, avatar_url, phone)
      `)
      .single();

    if (error) {
      console.error('❌ Insert error:', error);
      throw error;
    }

    console.log('✅ Insert result:', data);

    // Log activity
    const memberName = data.full_name || data.user?.full_name || 'member';
    await ActivityLogger.logCommunityActivity(
      communityId,
      addedBy,
      'member_added',
      `Added ${memberName} as ${role}`,
      { member_id: userId, role }
    );

    return data;
  }

  // Remove member from community
  async removeMember(communityId, memberId, removedBy) {
    // Get member info before deletion
    const { data: member } = await supabaseService.client
      .from('community_members')
      .select('*, user:users(full_name)')
      .eq('id', memberId)
      .eq('community_id', communityId)
      .single();

    if (!member) {
      throw new Error('Member not found');
    }

    const { data, error } = await supabaseService.client
      .from('community_members')
      .delete()
      .eq('id', memberId)
      .eq('community_id', communityId)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    const memberName = member.full_name || member.user?.full_name || 'member';
    await ActivityLogger.logCommunityActivity(
      communityId,
      removedBy,
      'member_removed',
      `Removed ${memberName} from community`,
      { member_id: memberId }
    );

    return data;
  }

  // Update member role
  async updateMemberRole(communityId, memberId, newRole, updatedBy) {
    const { data, error } = await supabaseService.client
      .from('community_members')
      .update({ role: newRole })
      .eq('id', memberId)
      .eq('community_id', communityId)
      .select(`
        *,
        user:users(id, full_name, email, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Log activity
    const memberName = data.full_name || data.user?.full_name || 'member';
    await ActivityLogger.logCommunityActivity(
      communityId,
      updatedBy,
      'member_role_updated',
      `Updated ${memberName}'s role to ${newRole}`,
      { member_id: memberId, new_role: newRole }
    );

    return data;
  }

  // Update member info (name, email, phone)
  async updateMember(communityId, memberId, updateData, updatedBy) {
    const allowedFields = ['full_name', 'email', 'phone', 'role', 'status'];
    const filteredData = {};

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        filteredData[key] = updateData[key];
      }
    });

    const { data, error } = await supabaseService.client
      .from('community_members')
      .update(filteredData)
      .eq('id', memberId)
      .eq('community_id', communityId)
      .select(`
        *,
        user:users(id, full_name, email, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Log activity
    const memberName = data.full_name || data.user?.full_name || 'member';
    await ActivityLogger.logCommunityActivity(
      communityId,
      updatedBy,
      'member_updated',
      `Updated ${memberName}'s information`,
      { member_id: memberId, updated_fields: Object.keys(filteredData) }
    );

    return data;
  }

  // Update member status
  async updateMemberStatus(communityId, memberId, newStatus, updatedBy) {
    const { data, error } = await supabaseService.client
      .from('community_members')
      .update({ status: newStatus })
      .eq('id', memberId)
      .eq('community_id', communityId)
      .select(`
        *,
        user:users(id, full_name, email, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Log activity
    const memberName = data.full_name || data.user?.full_name || 'member';
    await ActivityLogger.logCommunityActivity(
      communityId,
      updatedBy,
      'member_status_updated',
      `Updated ${memberName}'s status to ${newStatus}`,
      { member_id: memberId, new_status: newStatus }
    );

    return data;
  }

  // Get community members
  async getCommunityMembers(communityId, filters = {}) {
    const { role, status, search } = filters;

    let query = supabaseService.client
      .from('community_members')
      .select(`
        *,
        user:users(id, full_name, email, avatar_url, phone, status)
      `)
      .eq('community_id', communityId);

    if (role) query = query.eq('role', role);
    if (status) query = query.eq('status', status);

    query = query.order('joined_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    // Merge user data with member data (prefer member table data)
    const members = data.map(member => ({
      ...member,
      full_name: member.full_name || member.user?.full_name || 'Unknown Member',
      email: member.email || member.user?.email || '',
      phone: member.phone || member.user?.phone || '',
      avatar_url: member.user?.avatar_url || null
    }));

    // Filter by search if provided
    if (search && members) {
      return members.filter(member =>
        member.full_name.toLowerCase().includes(search.toLowerCase()) ||
        member.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    return members;
  }

  // Get member details
  async getMemberDetails(communityId, userId) {
    const { data, error } = await supabase
      .from('community_members')
      .select(`
        *,
        user:users(id, full_name, email, avatar_url, phone, status)
      `)
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    // Get member's task statistics
    const { data: tasks } = await supabase
      .from('tasks')
      .select('status')
      .eq('community_id', communityId)
      .contains('assignees', [userId]);

    const taskStats = {
      total: tasks?.length || 0,
      completed: tasks?.filter(t => t.status === 'done').length || 0,
      in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0
    };

    // Get member's event registrations
    const { count: eventCount } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return {
      ...data,
      stats: {
        tasks: taskStats,
        events_attended: eventCount || 0
      }
    };
  }

  // Import members from CSV
  async importMembers(communityId, membersData, importedBy) {
    const results = {
      success: [],
      failed: []
    };

    for (const memberData of membersData) {
      try {
        // Check if user exists by email
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('email', memberData.email)
          .single();

        if (!user) {
          results.failed.push({
            email: memberData.email,
            reason: 'User not found'
          });
          continue;
        }

        // Add member
        await this.addMember(
          communityId,
          user.id,
          memberData.role || 'member',
          importedBy
        );

        results.success.push({
          email: memberData.email,
          user_id: user.id
        });
      } catch (error) {
        results.failed.push({
          email: memberData.email,
          reason: error.message
        });
      }
    }

    // Log activity
    await ActivityLogger.logCommunityActivity(
      communityId,
      importedBy,
      'members_imported',
      `Imported ${results.success.length} members (${results.failed.length} failed)`,
      { results }
    );

    return results;
  }
}

module.exports = new MemberService();
