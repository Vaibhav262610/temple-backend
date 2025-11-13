const supabaseService = require('../supabaseService');
const ActivityLogger = require('../../utils/activityLogger');

class MemberService {
  // Add member to community
  async addMember(communityId, userId, role = 'member', addedBy) {
    // Check if member already exists
    const { data: existing } = await supabaseService.client
      .from('community_members')
      .select('*')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      throw new Error('User is already a member of this community');
    }

    const { data, error } = await supabaseService.client
      .from('community_members')
      .insert([{
        community_id: communityId,
        user_id: userId,
        role: role,
        status: 'active',
        joined_at: new Date().toISOString()
      }])
      .select(`
        *,
        user:users(id, full_name, email, avatar_url, phone)
      `)
      .single();

    if (error) throw error;

    // Log activity
    await ActivityLogger.logCommunityActivity(
      communityId,
      addedBy,
      'member_added',
      `Added ${data.user.full_name} as ${role}`,
      { member_id: userId, role }
    );

    return data;
  }

  // Remove member from community
  async removeMember(communityId, userId, removedBy) {
    // Get member info before deletion
    const { data: member } = await supabase
      .from('community_members')
      .select('user:users(full_name)')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .single();

    const { data, error } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await ActivityLogger.logCommunityActivity(
      communityId,
      removedBy,
      'member_removed',
      `Removed ${member?.user?.full_name || 'member'} from community`,
      { member_id: userId }
    );

    return data;
  }

  // Update member role
  async updateMemberRole(communityId, userId, newRole, updatedBy) {
    const { data, error } = await supabase
      .from('community_members')
      .update({ role: newRole })
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .select(`
        *,
        user:users(id, full_name, email, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Log activity
    await ActivityLogger.logCommunityActivity(
      communityId,
      updatedBy,
      'member_role_updated',
      `Updated ${data.user.full_name}'s role to ${newRole}`,
      { member_id: userId, new_role: newRole }
    );

    return data;
  }

  // Update member status
  async updateMemberStatus(communityId, userId, newStatus, updatedBy) {
    const { data, error } = await supabase
      .from('community_members')
      .update({ status: newStatus })
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .select(`
        *,
        user:users(id, full_name, email, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Log activity
    await ActivityLogger.logCommunityActivity(
      communityId,
      updatedBy,
      'member_status_updated',
      `Updated ${data.user.full_name}'s status to ${newStatus}`,
      { member_id: userId, new_status: newStatus }
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

    // Filter by search if provided
    if (search && data) {
      return data.filter(member =>
        member.user.full_name.toLowerCase().includes(search.toLowerCase()) ||
        member.user.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    return data;
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
