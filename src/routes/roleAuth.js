// middleware/roleAuth.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for admin operations
);

/**
 * Middleware to check if user has required role(s)
 * @param {Array<string>} allowedRoles - Array of roles that can access the route
 * @returns {Function} Express middleware function
 */
const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false,
          error: 'No token provided' 
        });
      }

      const token = authHeader.replace('Bearer ', '');

      // Verify token and get user
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return res.status(401).json({ 
          success: false,
          error: 'Invalid or expired token' 
        });
      }

      // Fetch user role from database
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (roleError || !userRole) {
        return res.status(403).json({ 
          success: false,
          error: 'No active role assigned to this user' 
        });
      }

      // Check if user has required role
      if (!allowedRoles.includes(userRole.role)) {
        return res.status(403).json({ 
          success: false,
          error: 'Insufficient permissions',
          details: {
            required: allowedRoles,
            current: userRole.role
          }
        });
      }

      // Attach user and role to request object
      req.user = user;
      req.userRole = userRole.role;
      
      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Authorization failed',
        message: error.message 
      });
    }
  };
};

/**
 * Middleware to optionally attach user info without requiring authentication
 * Useful for routes that have different behavior for authenticated vs anonymous users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      req.userRole = null;
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      req.user = null;
      req.userRole = null;
      return next();
    }

    // Fetch user role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    req.user = user;
    req.userRole = userRole?.role || null;
    
    next();
  } catch (error) {
    req.user = null;
    req.userRole = null;
    next();
  }
};

/**
 * Middleware to require authentication without role checking
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired token' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      error: 'Authentication failed' 
    });
  }
};

module.exports = { 
  checkRole, 
  optionalAuth, 
  requireAuth 
};
