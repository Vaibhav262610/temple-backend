// routes/admin.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { checkRole } = require('../middleware/roleAuth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate random password
function generateRandomPassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;

  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Create user from admin panel (with random password and email)
router.post('/create-user', async (req, res) => {
  try {
    const { email, full_name, phone, role } = req.body;

    console.log('👤 Admin creating new user:', { email, full_name, role });

    // Validate required fields
    if (!email || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Email and full name are required'
      });
    }

    // Valid roles
    const validRoles = [
      'super_admin',
      'community_owner',
      'finance',
      'board',
      'community_lead',
      'community_member',
      'volunteer',
      'chairman',
      'user'
    ];

    const userRole = role && validRoles.includes(role) ? role : 'user';

    // Check if user already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Generate random password
    const randomPassword = generateRandomPassword(12);
    console.log('🔐 Generated random password for:', email);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    // Create user in database
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        full_name: full_name,
        phone: phone || null,
        role: userRole,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating user:', createError);
      throw createError;
    }

    console.log('✅ User created successfully:', newUser.id);

    // Send welcome email with password
    try {
      const emailService = require('../services/emailService-sendgrid');

      const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://temple-management-woad.vercel.app';

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .credentials-box { background: #fff7ed; border: 2px solid #f97316; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .credentials-box h3 { color: #ea580c; margin-top: 0; }
            .credential-item { background: white; padding: 10px 15px; margin: 10px 0; border-radius: 5px; font-family: monospace; font-size: 14px; border: 1px solid #fed7aa; }
            .credential-label { color: #9a3412; font-weight: bold; font-family: Arial, sans-serif; }
            .button { display: inline-block; padding: 14px 35px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .button:hover { background: #ea580c; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .role-badge { display: inline-block; background: #f97316; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🙏 Welcome to Temple Management System</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your account has been created</p>
            </div>
            <div class="content">
              <h2>Hello ${full_name}!</h2>
              
              <p>An administrator has created an account for you in the Temple Management System.</p>
              
              <p><strong>Your Role:</strong> <span class="role-badge">${userRole}</span></p>
              
              <div class="credentials-box">
                <h3>🔐 Your Login Credentials</h3>
                <p>Please save these credentials securely:</p>
                
                <div class="credential-item">
                  <span class="credential-label">Email:</span><br>
                  <strong>${email}</strong>
                </div>
                
                <div class="credential-item">
                  <span class="credential-label">Temporary Password:</span><br>
                  <strong>${randomPassword}</strong>
                </div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important Security Notice:</strong><br>
                Please change your password immediately after your first login for security purposes.
              </div>
              
              <center>
                <a href="${frontendUrl}/auth" class="button">
                  Login to Your Account →
                </a>
              </center>
              
              <p style="margin-top: 30px;"><strong>What you can do:</strong></p>
              <ul>
                <li>Access the Temple Management Dashboard</li>
                <li>View and manage temple activities</li>
                <li>Participate in community events</li>
                ${userRole === 'chairman' || userRole === 'board' || userRole === 'super_admin' ? '<li>Access administrative features</li>' : ''}
              </ul>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                If you did not expect this email or have any questions, please contact the temple administration.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Temple Management System. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await emailService.sendEmail({
        from: `${process.env.EMAIL_FROM_NAME || 'Temple Admin'} <${process.env.EMAIL_FROM || 'noreply@temple.com'}>`,
        to: email,
        subject: '🙏 Your Temple Management Account Has Been Created',
        html: emailHtml
      });

      console.log('✅ Welcome email with credentials sent to:', email);

    } catch (emailError) {
      console.error('⚠️ Failed to send welcome email:', emailError.message);
      // Don't fail user creation if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully. Welcome email with login credentials has been sent.',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
          phone: newUser.phone,
          role: newUser.role,
          status: newUser.status
        },
        // Only include password in response for admin reference (remove in production if needed)
        temporaryPassword: randomPassword,
        emailSent: true
      }
    });

  } catch (error) {
    console.error('❌ Error creating user from admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

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
    }

    // Find user by email using admin API
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    const user = users?.find(u => u.email === email);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

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
    }

    res.json({
      message: `Role '${role}' assigned successfully to ${email}`
    });
  }
);

// Get all users (admin only)
router.get('/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, phone, role, status, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// Resend welcome email with new password
router.post('/resend-credentials', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (findError || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new random password
    const newPassword = generateRandomPassword(12);

    // Hash and update password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Send email with new credentials
    try {
      const emailService = require('../services/emailService-sendgrid');
      const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://temple-management-woad.vercel.app';

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials-box { background: #fff7ed; border: 2px solid #f97316; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .credential-item { background: white; padding: 10px 15px; margin: 10px 0; border-radius: 5px; font-family: monospace; }
            .button { display: inline-block; padding: 14px 35px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset</h1>
            </div>
            <div class="content">
              <h2>Hello ${user.full_name}!</h2>
              <p>Your password has been reset by an administrator.</p>
              
              <div class="credentials-box">
                <h3>Your New Login Credentials</h3>
                <div class="credential-item">
                  <strong>Email:</strong> ${email}
                </div>
                <div class="credential-item">
                  <strong>New Password:</strong> ${newPassword}
                </div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong> Please change your password after logging in.
              </div>
              
              <center>
                <a href="${frontendUrl}/auth" class="button">Login Now →</a>
              </center>
            </div>
          </div>
        </body>
        </html>
      `;

      await emailService.sendEmail({
        from: `${process.env.EMAIL_FROM_NAME || 'Temple Admin'} <${process.env.EMAIL_FROM || 'noreply@temple.com'}>`,
        to: email,
        subject: '🔐 Your Password Has Been Reset - Temple Management',
        html: emailHtml
      });

      console.log('✅ Password reset email sent to:', email);

    } catch (emailError) {
      console.error('⚠️ Failed to send email:', emailError.message);
    }

    res.json({
      success: true,
      message: 'New credentials sent to user email',
      data: {
        email: user.email,
        temporaryPassword: newPassword
      }
    });

  } catch (error) {
    console.error('Error resending credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend credentials',
      error: error.message
    });
  }
});

module.exports = router;
