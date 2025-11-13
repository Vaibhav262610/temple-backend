const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id);
    
    if (!user) {
      req.user = null;
      return next();
    }

    req.user = {
      id: user.id || user._id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      roles: [user.role] // Convert single role to array for compatibility
    };

    console.log('✅ Auth middleware: User authenticated:', req.user.email);
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    req.user = null;
    next();
  }
};

module.exports = authMiddleware;
