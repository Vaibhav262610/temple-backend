// Hybrid User Service - Saves to both memory and attempts Supabase
const { randomUUID } = require('crypto');
const supabaseService = require('./supabaseService');

// In-memory storage as fallback
const users = new Map();
const usersByEmail = new Map();

class HybridUserService {

  static async createUser(userData) {
    const userId = randomUUID();
    const now = new Date().toISOString();

    const user = {
      id: userId,
      email: userData.email.toLowerCase(),
      full_name: userData.full_name,
      phone: userData.phone || null,
      avatar_url: userData.avatar_url || null,
      status: userData.status || 'active',
      role: userData.role || 'user',
      metadata: userData.metadata || {},
      preferences: userData.preferences || {
        notifications: { push: true, email: true, whatsapp: true }
      },
      created_at: now,
      updated_at: now,
      last_login_at: null,
      password_hash: userData.password_hash
    };

    // Always save to memory first (guaranteed to work)
    users.set(userId, user);
    usersByEmail.set(user.email, user);
    console.log('✅ User saved to memory:', user.email);

    // Attempt to save to Supabase (best effort)
    try {
      const supabaseData = await supabaseService.createUser(user);
      if (supabaseData) {
        console.log('✅ User also saved to Supabase:', supabaseData.id);
      }
    } catch (error) {
      console.log('⚠️ Supabase save failed (using memory):', error.message);
    }

    return user;
  }

  static async findUserByEmail(email) {
    const emailLower = email.toLowerCase();

    // Try Supabase first
    try {
      const { data, error } = await supabaseService.client
        .from('users')
        .select('*')
        .eq('email', emailLower)
        .maybeSingle();

      if (!error && data) {
        console.log('✅ User found in Supabase:', data.email);
        return data;
      }
    } catch (error) {
      console.log('⚠️ Supabase query failed, checking memory:', error.message);
    }

    // Fallback to memory
    const memoryUser = usersByEmail.get(emailLower);
    if (memoryUser) {
      console.log('✅ User found in memory:', memoryUser.email);
      return memoryUser;
    }

    return null;
  }

  static async findUserById(id) {
    // Try Supabase first
    try {
      const { data, error } = await supabaseService.client
        .from('users')
        .select('*')
        .eq('id', String(id))
        .single();

      if (!error && data) {
        console.log('✅ User found in Supabase by ID:', data.id);
        return data;
      }
    } catch (error) {
      console.log('⚠️ Supabase query failed, checking memory:', error.message);
    }

    // Fallback to memory
    const memoryUser = users.get(String(id));
    if (memoryUser) {
      console.log('✅ User found in memory by ID:', memoryUser.id);
      return memoryUser;
    }

    return null;
  }

  static async updateUserLastLogin(id) {
    const now = new Date().toISOString();

    // Update in memory
    const memoryUser = users.get(String(id));
    if (memoryUser) {
      memoryUser.last_login_at = now;
      memoryUser.updated_at = now;
      users.set(String(id), memoryUser);
      usersByEmail.set(memoryUser.email, memoryUser);
    }

    // Attempt to update in Supabase
    try {
      const { data, error } = await supabaseService.client
        .from('users')
        .update({
          last_login_at: now,
          updated_at: now
        })
        .eq('id', String(id))
        .select('*')
        .single();

      if (!error && data) {
        console.log('✅ Login time updated in Supabase');
        return data;
      }
    } catch (error) {
      console.log('⚠️ Supabase update failed (memory updated):', error.message);
    }

    return memoryUser;
  }

  static async getAllUsers() {
    // Try Supabase first
    try {
      const { data, error } = await supabaseService.client
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        console.log('✅ Users loaded from Supabase:', data.length);
        return data;
      }
    } catch (error) {
      console.log('⚠️ Supabase query failed, using memory:', error.message);
    }

    // Fallback to memory
    const memoryUsers = Array.from(users.values());
    console.log('✅ Users loaded from memory:', memoryUsers.length);
    return memoryUsers;
  }
}

module.exports = HybridUserService;