// Temporary In-Memory User Model for Testing
const { randomUUID } = require('crypto');

// In-memory storage
const users = new Map();
const usersByEmail = new Map();

// Pre-populate with test users
const testUsers = [
  {
    id: randomUUID(),
    email: 'admin@temple.com',
    password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // "password123"
    full_name: 'Temple Administrator',
    role: 'admin',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: randomUUID(),
    email: 'user@temple.com',
    password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // "password123"
    full_name: 'Temple User',
    role: 'user',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date()
  }
];

// Initialize with test users
testUsers.forEach(user => {
  users.set(user.id, user);
  usersByEmail.set(user.email, user);
});

class UserAdapter {
  constructor(doc) {
    Object.assign(this, doc);
    this._id = this.id; // For compatibility
  }

  select() { return this; }

  async save() {
    const now = new Date();
    const id = this.id || this._id || randomUUID();
    const email = (this.email || '').toLowerCase();

    const userData = {
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
      metadata: this.metadata || {},
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

    // Store in memory
    users.set(id, userData);
    usersByEmail.set(email, userData);

    // Update instance
    Object.assign(this, userData, { _id: id });
    return this;
  }

  static async findOne(filter = {}) {
    if (filter.email) {
      const user = usersByEmail.get(filter.email.toLowerCase());
      return user ? new UserAdapter(user) : null;
    }

    if (filter.id || filter._id) {
      const id = filter.id || filter._id;
      const user = users.get(String(id));
      return user ? new UserAdapter(user) : null;
    }

    // Find first matching user
    for (const user of users.values()) {
      let matches = true;
      for (const [key, value] of Object.entries(filter)) {
        if (user[key] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return new UserAdapter(user);
      }
    }

    return null;
  }

  static async findById(id) {
    const user = users.get(String(id));
    return user ? new UserAdapter({ ...user, _id: user.id }) : null;
  }

  static find(filter = {}) {
    const chain = {
      async then(resolve, reject) {
        try {
          const results = [];
          for (const user of users.values()) {
            let matches = true;
            for (const [key, value] of Object.entries(filter)) {
              if (user[key] !== value) {
                matches = false;
                break;
              }
            }
            if (matches) {
              results.push(new UserAdapter(user));
            }
          }
          resolve(results);
        } catch (e) {
          reject && reject(e);
        }
      },
      select() { return chain; },
      populate() { return chain; },
      sort() { return chain; },
      skip() { return chain; },
      limit() { return chain; }
    };
    return chain;
  }

  static async findByIdAndUpdate(id, update = {}, options = {}) {
    const current = await UserAdapter.findById(id);
    if (!current) return null;

    // Apply updates
    const merged = { ...current };
    Object.assign(merged, update);
    merged.updated_at = new Date();

    // Save back
    users.set(String(id), merged);
    if (merged.email) {
      usersByEmail.set(merged.email.toLowerCase(), merged);
    }

    const result = options && options.new === false ? current : new UserAdapter({ ...merged, _id: merged.id });
    result.select = function () { return this; };
    return result;
  }

  static async findByIdAndDelete(id) {
    const existing = await UserAdapter.findById(id);
    if (!existing) return null;

    users.delete(String(id));
    if (existing.email) {
      usersByEmail.delete(existing.email.toLowerCase());
    }

    return existing;
  }

  static async countDocuments(filter = {}) {
    let count = 0;
    for (const user of users.values()) {
      let matches = true;
      for (const [key, value] of Object.entries(filter)) {
        if (user[key] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) count++;
    }
    return count;
  }
}

module.exports = UserAdapter;