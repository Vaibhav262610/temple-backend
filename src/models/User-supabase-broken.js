// Supabase-backed User model adapter, preserving commonly used Mongoose-like APIs
const { supabase } = require('../config/supabase');
const { randomUUID } = require('crypto');

const TABLE = 'users';

class UserAdapter {
  constructor(doc) {
    // Expose fields directly on the instance like a Mongoose document
    Object.assign(this, doc);
  }

  select() { return this; }

  async save() {
    const now = new Date();
    const id = this.id || this._id || randomUUID();
    const email = (this.email || '').toLowerCase();
    const row = {
      id,
      email,
      full_name: this.full_name || null,
      phone: this.phone || null,
      avatar_url: this.avatar_url || null,
      date_of_birth: this.date_of_birth || null,
      gender: this.gender || null,
      address: this.address || null,
      emergency_contact: this.emergency_contact || null,
      status: this.status || 'active',
      metadata: this.metadata || this.address || {},
      preferences: this.preferences || {},
      role: this.role || 'user',
      auth_provider: this.auth_provider || 'local',
      email_verified: this.email_verified ?? false,
      phone_verified: this.phone_verified ?? false,
      created_at: this.created_at || now,
      updated_at: now,
      last_login_at: this.last_login || this.last_login_at || null,
      password_hash: this.password_hash || null
    };
    const { data, error } = await supabase.from(TABLE).upsert(row).select('*').single();
    if (error) throw error;
    // Update instance fields to mimic mongoose post-save behavior
    Object.assign(this, data, { _id: data.id });
    return this;
  }

  static async findOne(filter = {}) {
    const { data, error } = await supabase.from(TABLE).select('*').match(normalizeFilter(filter)).limit(1).maybeSingle();
    if (error) throw error;
    return data ? new UserAdapter(data) : null;
  }

  static async findById(id) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', String(id)).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? new UserAdapter({ ...data, _id: data.id }) : null;
  }

  static find(filter = {}) {
    const base = supabase.from(TABLE).select('*');
    const query = applyFilter(base, filter);
    // Return a tiny chainable with select() and populate() compatibility
    const chain = {
      async then(resolve, reject) {
        try {
          const { data, error } = await query;
          if (error) throw error;
          resolve(data || []);
        } catch (e) { reject && reject(e); }
      },
      select() { return chain; },
      populate() { return chain; }
    };
    return chain;
  }

  static async findByIdAndUpdate(id, update = {}, options = {}) {
    const current = await UserAdapter.findById(id);
    if (!current) return null;
    const merged = applyMongoUpdate(current, update);
    merged.updated_at = new Date();
    const { data, error } = await supabase.from(TABLE).update(merged).eq('id', String(id)).select('*').single();
    if (error) throw error;
    const result = options && options.new === false ? current : new UserAdapter({ ...data, _id: data.id });
    // allow chaining .select('-password_hash') from controllers
    result.select = function() { return this; };
    return result;
  }

  static async findByIdAndDelete(id) {
    const existing = await UserAdapter.findById(id);
    if (!existing) return null;
    const { error } = await supabase.from(TABLE).delete().eq('id', String(id));
    if (error) throw error;
    return existing;
  }

  static async countDocuments(filter = {}) {
    const query = applyFilter(supabase.from(TABLE).select('*', { count: 'exact', head: true }), filter);
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }
}

function normalizeFilter(filter) {
  const normalized = { ...filter };
  if (normalized._id) {
    normalized.id = String(normalized._id);
    delete normalized._id;
  }
  return normalized;
}

function applyFilter(q, filter) {
  const f = normalizeFilter(filter);
  let query = q;
  for (const [key, value] of Object.entries(f)) {
    if (value && typeof value === 'object' && ('$in' in value)) {
      query = query.in(key, value.$in.map(String));
    } else {
      query = query.eq(key, typeof value === 'object' ? JSON.stringify(value) : value);
    }
  }
  return query;
}

function applyMongoUpdate(doc, update) {
  const out = { ...doc };
  if (update.$set) {
    Object.assign(out, update.$set);
  }
  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) {
      const curr = Number(out[k] || 0);
      out[k] = curr + Number(v);
    }
  }
  // Shallow merge for direct fields
  for (const [k, v] of Object.entries(update)) {
    if (!k.startsWith('$')) out[k] = v;
  }
  return out;
}

module.exports = UserAdapter;
