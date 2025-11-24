// Role-based authentication middleware
const jwt = require('jsonwebtoken');

/**
 * Middleware to check if user has required role(s)
 * @param {Array<string>} allowedRoles - Array of roles that are allowed
 * @returns {Function} Express middleware function
 */
function checkRole(allowedRoles = []) {
    return async (req, res, next) => {
        try {
            // Get token from header
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required. Please provide a valid token.'
                });
            }

            const token = authHeader.substring(7); // Remove 'Bearer ' prefix

            // Verify token
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
            } catch (error) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
            }

            // Check if user has required role
            const userRole = decoded.role || 'user';

            // Super admin has access to everything
            if (userRole === 'super_admin') {
                req.user = decoded;
                return next();
            }

            // Check if user's role is in allowed roles
            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${userRole}`
                });
            }

            // Attach user to request
            req.user = decoded;
            next();

        } catch (error) {
            console.error('Role check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking user permissions'
            });
        }
    };
}

/**
 * Middleware to check if user is authenticated (any role)
 */
function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

    } catch (error) {
        console.error('Auth check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking authentication'
        });
    }
}

module.exports = {
    checkRole,
    requireAuth
};
