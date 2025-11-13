// routes/admin.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { checkRole } = require('../middleware/roleAuth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Assign role to user (super_admin only)
router.post('/assign-role',
  checkRole(['super_admin']),
  async (req, res) => {
    const { email, role } = req.body;

    // Valid roles
    const validRoles = [
      'super_admin',
      'community_owner',
      'finance',
      'board',
      'community_lead',
      'community_member',
      'volunteer'
    ];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    } // ✅ FIXED: Added closing brace

    // Find user by email using admin API
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    const user = users?.find(u => u.email === email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    } // ✅ FIXED: Added closing brace

    // Update or insert role
    const { data, error } = await supabase
      .from('user_roles')
      .upsert({ 
        user_id: user.id,
        role: role, 
        is_active: true 
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    } // ✅ FIXED: Added closing brace

    res.json({
      message: `Role '${role}' assigned successfully to ${email}`
    });
  }
);

module.exports = router;
