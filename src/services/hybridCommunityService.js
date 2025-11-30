// Hybrid Community Service - Fetches from and saves to Supabase
const { randomUUID } = require('crypto');
const supabaseService = require('./supabaseService');

// In-memory storage as fallback
const communities = new Map();

class HybridCommunityService {

  static async createCommunity(communityData) {
    const communityId = randomUUID();
    const now = new Date().toISOString();

    const community = {
      id: communityId,
      name: communityData.name,
      slug: communityData.slug || communityData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: communityData.description || '',
      owner_id: communityData.owner_id,
      logo_url: communityData.logo_url || '/placeholder.svg',
      cover_image_url: communityData.cover_image_url || null,
      status: communityData.status || 'active',
      settings: communityData.settings || { public_visible: true, allow_join_requests: true },
      metadata: communityData.metadata || {},
      created_at: now,
      updated_at: now
    };

    // Always save to memory first (guaranteed to work)
    communities.set(communityId, community);
    console.log('✅ Community saved to memory:', community.name);

    // Attempt to save to Supabase (best effort)
    try {
      const supabaseData = await supabaseService.createCommunity(community);
      if (supabaseData) {
        console.log('✅ Community also saved to Supabase:', supabaseData.id);
        // Update memory with Supabase data (in case of any differences)
        communities.set(communityId, { ...supabaseData, _id: supabaseData.id });
      }
    } catch (error) {
      console.log('⚠️ Supabase save failed (using memory):', error.message);
    }

    return { ...community, _id: community.id };
  }

  static async getAllCommunities(filters = {}) {
    let supabaseData = [];

    // Try Supabase first
    try {
      const data = await supabaseService.getAllCommunities(filters);
      if (data && data.length >= 0) {
        console.log('✅ Communities loaded from Supabase:', data.length);
        supabaseData = data.map(item => ({ ...item, _id: item.id }));
      }
    } catch (error) {
      console.log('⚠️ Supabase connection failed, using memory:', error.message);
    }

    // Get memory data as fallback
    const memoryData = Array.from(communities.values());

    // Combine data (Supabase takes priority, memory as fallback)
    const allCommunities = supabaseData.length > 0 ? supabaseData : memoryData;

    // Apply memory-based filters if needed
    let filteredCommunities = allCommunities;

    if (filters.search && supabaseData.length === 0) {
      const searchLower = filters.search.toLowerCase();
      filteredCommunities = allCommunities.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        (c.description || '').toLowerCase().includes(searchLower)
      );
    }

    if (filters.status && filters.status !== 'all' && supabaseData.length === 0) {
      filteredCommunities = filteredCommunities.filter(c => c.status === filters.status);
    }

    if (filters.owner_id && filters.owner_id !== 'all' && supabaseData.length === 0) {
      filteredCommunities = filteredCommunities.filter(c => c.owner_id === filters.owner_id);
    }

    console.log('📊 Total communities returned:', filteredCommunities.length);
    return filteredCommunities;
  }

  static async getCommunityById(id) {
    // Try Supabase first
    try {
      const { data, error } = await supabaseService.client
        .from('communities')
        .select('*')
        .eq('id', String(id))
        .single();

      if (!error && data) {
        console.log('✅ Community found in Supabase by ID:', data.id);
        return { ...data, _id: data.id };
      }
    } catch (error) {
      console.log('⚠️ Supabase query failed, checking memory:', error.message);
    }

    // Fallback to memory
    const memoryCommunity = communities.get(String(id));
    if (memoryCommunity) {
      console.log('✅ Community found in memory by ID:', memoryCommunity.id);
      return memoryCommunity;
    }

    return null;
  }

  static async updateCommunity(id, updateData) {
    const now = new Date().toISOString();
    const updates = { ...updateData, updated_at: now };

    // Update in memory
    const memoryCommunity = communities.get(String(id));
    if (memoryCommunity) {
      const updatedCommunity = { ...memoryCommunity, ...updates };
      communities.set(String(id), updatedCommunity);
      console.log('✅ Community updated in memory:', id);
    }

    // Attempt to update in Supabase
    try {
      const { data, error } = await supabaseService.client
        .from('communities')
        .update(updates)
        .eq('id', String(id))
        .select('*')
        .single();

      if (!error && data) {
        console.log('✅ Community updated in Supabase:', data.id);
        return { ...data, _id: data.id };
      } else {
        console.log('⚠️ Supabase update failed (memory updated):', error?.message);
      }
    } catch (error) {
      console.log('⚠️ Supabase connection failed (memory updated):', error.message);
    }

    return memoryCommunity ? { ...memoryCommunity, ...updates } : null;
  }

  static async deleteCommunity(id) {
    // Remove from memory
    const memoryCommunity = communities.get(String(id));
    if (memoryCommunity) {
      communities.delete(String(id));
      console.log('✅ Community removed from memory:', id);
    }

    // Permanently delete from Supabase database
    try {
      const { data, error } = await supabaseService.client
        .from('communities')
        .delete()
        .eq('id', String(id))
        .select('*')
        .single();

      if (!error && data) {
        console.log('✅ Community permanently deleted from Supabase:', data.id);
        return { ...data, _id: data.id };
      } else {
        console.log('⚠️ Supabase delete failed (memory removed):', error?.message);
      }
    } catch (error) {
      console.log('⚠️ Supabase connection failed (memory removed):', error.message);
    }

    return memoryCommunity;
  }

  static async getCommunityStats(id) {
    // Try to get from Supabase first
    try {
      const { data, error } = await supabaseService.client
        .from('communities')
        .select('*')
        .eq('id', String(id))
        .single();

      if (!error && data) {
        const stats = {
          member_count: 0, // Would need to query community_members table
          status: data.status,
          created_at: data.created_at,
          active_days: Math.floor((new Date() - new Date(data.created_at)) / (1000 * 60 * 60 * 24))
        };
        return stats;
      }
    } catch (error) {
      console.log('⚠️ Supabase stats query failed:', error.message);
    }

    // Fallback to memory
    const memoryCommunity = communities.get(String(id));
    if (memoryCommunity) {
      return {
        member_count: 0,
        status: memoryCommunity.status,
        created_at: memoryCommunity.created_at,
        active_days: Math.floor((new Date() - new Date(memoryCommunity.created_at)) / (1000 * 60 * 60 * 24))
      };
    }

    return null;
  }

  // Initialize with some default communities if both Supabase and memory are empty
  static async initializeDefaultCommunities() {
    try {
      // Check if we have any communities
      const existing = await this.getAllCommunities();

      if (existing.length === 0) {
        console.log('🏗️ Initializing default communities...');

        const defaultCommunities = [
          {
            name: 'Main Temple Community',
            description: 'Primary temple community for all devotees and activities',
            owner_id: 'admin-user-id',
            status: 'active'
          },
          {
            name: 'Youth Community',
            description: 'Community for young devotees and cultural activities',
            owner_id: 'admin-user-id',
            status: 'active'
          }
        ];

        for (const communityData of defaultCommunities) {
          await this.createCommunity(communityData);
        }

        console.log('✅ Default communities initialized');
      }
    } catch (error) {
      console.log('⚠️ Failed to initialize default communities:', error.message);
    }
  }
}

module.exports = HybridCommunityService;