// Supabase-backed Community model adapter, preserving commonly used Mongoose-like APIs
const { supabase } = require('../config/supabase');

const TABLE = 'communities';

class CommunityAdapter {
  constructor(doc) {
    // Expose fields directly on the instance like a Mongoose document
    Object.assign(this, doc);
  }

  select() { return this; }
  populate() { return this; }

  async save() {
    const now = new Date();
    const { randomUUID } = require('crypto');
    const row = {
      id: this.id || this._id || randomUUID(),
      name: this.name,
      slug: this.slug,
      description: this.description || null,
      owner_id: this.owner_id ? String(this.owner_id) : null,
      logo_url: this.logo_url || null,
      cover_image_url: this.cover_image_url || null,
      status: this.status || 'active',
      settings: this.settings || {},
      metadata: this.metadata || {},
      created_at: this.created_at || now,
      updated_at: now
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
    return data || null;
  }

  static async findById(id) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', String(id)).single();
    if (error && error.code !== 'PGRST116') throw error;
    const doc = data || null;
    if (doc === null) return null;
    // Return object supporting .populate() chaining similar to Mongoose
    doc.populate = function() { return this; };
    doc.select = function() { return this; };
    return doc;
  }

  static find(filter = {}) {
    const base = supabase.from(TABLE).select('*');
    const query = applyFilter(base, filter);
    let skipValue = 0;
    let limitValue = 1000; // Default large limit
    
    const chain = {
      async then(resolve, reject) {
        try {
          const finalQuery = query.range(skipValue, skipValue + limitValue - 1);
          const { data, error } = await finalQuery;
          if (error) throw error;
          resolve((data || []).map(d => new CommunityAdapter({ ...d, _id: d.id })));
        } catch (e) { reject && reject(e); }
      },
      select() { return chain; },
      populate() { return chain; },
      sort() { return chain; },
      skip(offset) { 
        skipValue = offset;
        return chain; 
      },
      limit(count) { 
        limitValue = count;
        return chain; 
      }
    };
    return chain;
  }

  static async findByIdAndUpdate(id, update = {}, options = {}) {
    const current = await CommunityAdapter.findById(id);
    if (!current) return null;
    const merged = applyMongoUpdate(current, update);
    merged.updated_at = new Date();
    const { data, error } = await supabase.from(TABLE).update(merged).eq('id', String(id)).select('*').single();
    if (error) throw error;
    return options && options.new === false ? current : data;
  }

  static async countDocuments(filter = {}) {
    const query = applyFilter(supabase.from(TABLE).select('*', { count: 'exact', head: true }), filter);
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  static async findByIdAndDelete(id) {
    const existing = await CommunityAdapter.findById(id);
    if (!existing) return null;
    const { error } = await supabase.from(TABLE).delete().eq('id', String(id));
    if (error) throw error;
    return existing;
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
  for (const [k, v] of Object.entries(update)) {
    if (!k.startsWith('$')) out[k] = v;
  }
  return out;
}

module.exports = CommunityAdapter;
