// Users Controller - Supabase
const HybridUserService = require('../services/hybridUserService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Register new user
const registerUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      email,
      password,
      full_name,
      phone,
      gender,
      address,
      emergency_contact,
      date_of_birth,
      auth_provider,
      role,
      status
    } = req.body;

    // Check if user already exists
    const existingUser = await HybridUserService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user (attempts Supabase, falls back to memory)
    const user = await HybridUserService.createUser({
      email: email.toLowerCase(),
      password_hash: hashedPassword,
      full_name,
      phone,
      gender,
      address,
      emergency_contact,
      date_of_birth,
      auth_provider: auth_provider || 'local',
      role: role || 'user',
      status: status || 'active'
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Send welcome/verification email
    try {
      const emailService = require('../services/emailService-sendgrid');
      const isAdminRegistration = role && ['admin', 'board', 'community_owner', 'volunteer_head', 'priest', 'finance_team'].includes(role);

      const emailSubject = isAdminRegistration
        ? '🎉 Admin Account Created - Temple Management System'
        : '✅ Registration Successful - Temple Management System';

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🙏 Welcome to Temple Management System</h1>
            </div>
            <div class="content">
              <h2>Hello ${full_name || 'User'}!</h2>
              
              ${isAdminRegistration ? `
                <p>Your admin account has been successfully created by the system administrator.</p>
                <div class="info-box">
                  <strong>Account Details:</strong><br>
                  📧 Email: ${email}<br>
                  👤 Role: ${role}<br>
                  ✅ Status: Active
                </div>
                <p>You now have administrative access to the Temple Management System.</p>
              ` : `
                <p>Thank you for registering with our Temple Management System!</p>
                <p>Your account has been successfully created and is now active.</p>
                <div class="info-box">
                  <strong>Account Details:</strong><br>
                  📧 Email: ${email}<br>
                  👤 Name: ${full_name || 'Not provided'}<br>
                  ✅ Status: Active
                </div>
              `}
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Log in to your account using your email and password</li>
                <li>Complete your profile information</li>
                <li>Explore the features available to you</li>
                ${isAdminRegistration ? '<li>Review your administrative permissions</li>' : ''}
              </ul>
              
              <center>
                <a href="${process.env.VITE_FRONTEND_URL || 'http://localhost:8081'}/login" class="button">
                  Login to Your Account
                </a>
              </center>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                If you did not create this account, please contact our support team immediately.
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
        subject: emailSubject,
        html: emailHtml
      });

      console.log(`✅ Welcome email sent to: ${email}`);
    } catch (emailError) {
      console.error('⚠️  Failed to send welcome email:', emailError.message);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. A welcome email has been sent.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role || 'user',
          status: user.status || 'active'
        },
        token
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error.message
    });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await HybridUserService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await HybridUserService.updateUserLastLogin(user.id);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role || 'user'
        },
        token
      }
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login'
    });
  }
};

// Get current user profile
const getCurrentUser = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await HybridUserService.findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
};

// Get all users with filtering and pagination
const getUsers = async (req, res) => {
  try {
    const {
      status,
      role,
      search,
      page = 1,
      limit = 50
    } = req.query;

    let allUsers = await HybridUserService.getAllUsers();

    // Apply filters
    if (status && status !== 'all') {
      allUsers = allUsers.filter(u => u.status === status);
    }

    if (role && role !== 'all') {
      allUsers = allUsers.filter(u => u.role === role);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      allUsers = allUsers.filter(u =>
        (u.full_name && u.full_name.toLowerCase().includes(searchLower)) ||
        (u.email && u.email.toLowerCase().includes(searchLower))
      );
    }

    const total = allUsers.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedUsers = allUsers.slice(skip, skip + parseInt(limit));

    // Remove password_hash from response
    const safeUsers = paginatedUsers.map(({ password_hash, ...user }) => user);

    res.json({
      success: true,
      data: safeUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await HybridUserService.findUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove password_hash from response
    const { password_hash, ...safeUser } = user;

    res.json({
      success: true,
      data: safeUser
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
};

// Update user profile
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent password updates through this endpoint
    const { password, password_hash, ...updateData } = req.body;

    const user = await HybridUserService.updateUser(id, updateData);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove password_hash from response
    const { password_hash: _, ...safeUser } = user;

    res.json({
      success: true,
      message: 'User updated successfully',
      data: safeUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // First check if user exists
    const user = await HybridUserService.findUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete from HybridUserService
    const deleted = await HybridUserService.deleteUser(id);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

// Change user password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await HybridUserService.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password using HybridUserService
    const updated = await HybridUserService.updateUserPassword(req.user.id, hashedPassword);

    if (!updated) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword
};
