/**
 * Authentication Middleware
 * Handles JWT token verification and role-based access control
 * 
 * @module middleware/auth
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

// Get JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

/**
 * Generate a JWT token for authenticated user
 * @param {number} userId - User ID
 * @param {string} email - User email
 * @param {string} role - User role (admin/sales/warehouse/supply)
 * @returns {string} JWT token
 */
const generateToken = (userId, email, role) => {
    return jwt.sign(
        { 
            id: userId, 
            email, 
            role 
        },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
};

/**
 * Verify JWT token and attach user to request
 * @middleware
 */
const authenticateToken = async (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access token required. Please login first.'
        });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get fresh user data from database
        const user = await User.findById(decoded.id);
        
        // Check if user exists and is active
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }
        
        if (!user.isActive()) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated. Please contact admin.'
            });
        }
        
        // Attach user to request object
        req.user = {
            id: user.getId(),
            email: user.getEmail(),
            role: user.getRole()
        };
        
        next();
    } catch (error) {
        // Handle specific JWT errors
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired. Please login again.'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({
                success: false,
                error: 'Invalid token.'
            });
        }
        
        return res.status(403).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Role-based authorization middleware
 * @param {...string} roles - Allowed roles
 * @returns {Function} Middleware function
 * 
 * @example
 * // Only admin can access
 * router.get('/users', authenticateToken, authorize('admin'), userController.getAll);
 * 
 * // Admin and sales can access
 * router.get('/orders', authenticateToken, authorize('admin', 'sales'), orderController.getAll);
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Access denied. ${req.user.role} cannot perform this action. Required role: ${roles.join(' or ')}`
            });
        }
        
        next();
    };
};

module.exports = { authenticateToken, authorize, generateToken };