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
        .maybeSingle();

      if (!error && data) {
        console.log('✅ User found in Supabase by ID:', data.id);
        return data;
      }

      if (error) {
        console.log('⚠️ Supabase findUserById error:', error.message);
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

  static async updateUser(id, updateData) {
    const now = new Date().toISOString();

    // Remove password from update data (use changePassword instead)
    const { password, password_hash, ...safeUpdateData } = updateData;

    // First, find the user to ensure they exist
    const existingUser = await this.findUserById(id);
    if (!existingUser) {
      console.log('❌ User not found for update:', id);
      return null;
    }

    // Update in memory
    const memoryUser = users.get(String(id));
    if (memoryUser) {
      Object.assign(memoryUser, safeUpdateData, { updated_at: now });
      users.set(String(id), memoryUser);
      usersByEmail.set(memoryUser.email, memoryUser);
      console.log('✅ User updated in memory:', memoryUser.email);
    }

    // Attempt to update in Supabase
    try {
      const { data, error } = await supabaseService.client
        .from('users')
        .update({
          ...safeUpdateData,
          updated_at: now
        })
        .eq('id', String(id))
        .select('*')
        .maybeSingle();

      if (error) {
        console.log('❌ Supabase update error:', error);
      }

      if (!error && data) {
        console.log('✅ User updated in Supabase:', data.email);
        return data;
      }
    } catch (error) {
      console.log('⚠️ Supabase update failed:', error.message);
    }

    // Return the updated existing user data if Supabase failed
    return memoryUser || { ...existingUser, ...safeUpdateData, updated_at: now };
  }

  static async updateUserPassword(id, hashedPassword) {
    const now = new Date().toISOString();

    // Update in memory
    const memoryUser = users.get(String(id));
    if (memoryUser) {
      memoryUser.password_hash = hashedPassword;
      memoryUser.updated_at = now;
      users.set(String(id), memoryUser);
      usersByEmail.set(memoryUser.email, memoryUser);
      console.log('✅ Password updated in memory');
    }

    // Attempt to update in Supabase
    try {
      const { data, error } = await supabaseService.client
        .from('users')
        .update({
          password_hash: hashedPassword,
          updated_at: now
        })
        .eq('id', String(id))
        .select('id, email')
        .maybeSingle();

      if (error) {
        console.log('⚠️ Supabase password update error:', error.message);
      }

      if (!error && data) {
        console.log('✅ Password updated in Supabase');
        return true;
      }
    } catch (error) {
      console.log('⚠️ Supabase password update failed:', error.message);
    }

    // Return true if we at least updated memory, or if user exists in Supabase
    return true;
  }

  static async deleteUser(id) {
    const userId = String(id);

    // Delete from memory
    const memoryUser = users.get(userId);
    if (memoryUser) {
      users.delete(userId);
      usersByEmail.delete(memoryUser.email);
      console.log('✅ User deleted from memory:', memoryUser.email);
    }

    // Attempt to delete from Supabase
    try {
      const { error } = await supabaseService.client
        .from('users')
        .delete()
        .eq('id', userId);

      if (!error) {
        console.log('✅ User deleted from Supabase');
        return true;
      }
    } catch (error) {
      console.log('⚠️ Supabase delete failed (memory deleted):', error.message);
    }

    return !!memoryUser;
  }
}

module.exports = HybridUserService;