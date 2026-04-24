/**
 * Authentication Middleware
 * Handles JWT token verification and role-based access control
 *
 * @module middleware/auth
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const crypto = require('crypto');

// Validate JWT_SECRET - fail fast if not properly configured
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set. This is a critical security requirement.');
}

if (JWT_SECRET === 'your-secret-key-change-this' || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be a secure, randomly generated string of at least 32 characters. Never use default values in production.');
}

// Token blacklist cache (in production, use Redis or database)
const tokenBlacklist = new Map();

/**
 * Add token to blacklist
 * @param {string} token - JWT token to blacklist
 * @param {number} ttl - Time to live in milliseconds
 */
const blacklistToken = (token, ttl) => {
    tokenBlacklist.set(token, Date.now() + ttl);
    
    // Cleanup expired entries periodically
    if (tokenBlacklist.size > 1000) {
        const now = Date.now();
        for (const [key, value] of tokenBlacklist.entries()) {
            if (value < now) {
                tokenBlacklist.delete(key);
            }
        }
    }
};

/**
 * Check if token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is blacklisted
 */
const isTokenBlacklisted = (token) => {
    const expiry = tokenBlacklist.get(token);
    if (expiry && expiry > Date.now()) {
        return true;
    }
    // Clean up expired entry
    if (expiry) {
        tokenBlacklist.delete(token);
    }
    return false;
};

/**
 * Generate a JWT token for authenticated user
 * @param {number} userId - User ID
 * @param {string} email - User email
 * @param {string} role - User role (admin/sales/warehouse/supply)
 * @returns {string} JWT token
 */
const generateToken = (userId, email, role) => {
    // Validate input parameters
    if (!userId || typeof userId !== 'number') {
        throw new Error('Invalid user ID');
    }
    if (!email || typeof email !== 'string') {
        throw new Error('Invalid email');
    }
    if (!role || typeof role !== 'string') {
        throw new Error('Invalid role');
    }
    
    return jwt.sign(
        {
            id: userId,
            email,
            role,
            iat: Math.floor(Date.now() / 1000), // Explicit issued-at timestamp
            jti: crypto.randomBytes(16).toString('hex') // Unique token identifier
        },
        JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRE || '24h',
            algorithm: 'HS256' // Explicitly specify algorithm to prevent confusion attacks
        }
    );
};

/**
 * Revoke a JWT token (add to blacklist)
 * @param {string} token - JWT token to revoke
 * @param {number} remainingTtl - Remaining TTL in milliseconds (optional)
 */
const revokeToken = (token, remainingTtl) => {
    let ttl = remainingTtl;
    
    if (!ttl) {
        // Decode token to get remaining expiration time
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.exp) {
                ttl = (decoded.exp - Math.floor(Date.now() / 1000)) * 1000;
            } else {
                ttl = 24 * 60 * 60 * 1000; // Default 24 hours
            }
        } catch (error) {
            ttl = 24 * 60 * 60 * 1000;
        }
    }
    
    blacklistToken(token, ttl);
};

/**
 * Verify JWT token and attach user to request
 * @middleware
 */
const authenticateToken = async (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Access denied. Invalid authorization header format.'
        });
    }
    
    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access token required. Please login first.'
        });
    }

    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
        return res.status(401).json({
            success: false,
            error: 'Token has been revoked. Please login again.'
        });
    }

    try {
        // Verify the token with explicit algorithm options
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'], // Prevent algorithm confusion attacks
            complete: true // Get header and payload
        });
        
        // Validate token payload structure
        if (!decoded.payload ||
            typeof decoded.payload.id !== 'number' ||
            !decoded.payload.email ||
            !decoded.payload.role) {
            return res.status(403).json({
                success: false,
                error: 'Invalid token structure.'
            });
        }
        
        // Get fresh user data from database
        const user = await User.findById(decoded.payload.id);
        
        // Check if user exists and is active
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found.'
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
            role: user.getRole(),
            tokenId: decoded.payload.jti // Store token ID for tracking
        };
        
        next();
    } catch (error) {
        // Log error internally but don't expose details to client
        console.error('Authentication error:', error.code || error.name);
        
        // Handle specific JWT errors
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Session expired. Please login again.'
            });
        }
        
        if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
            return res.status(403).json({
                success: false,
                error: 'Invalid or malformed token.'
            });
        }
        
        // Generic error message - don't expose internal error details
        return res.status(403).json({
            success: false,
            error: 'Authentication failed.'
        });
    }
};

/**
 * Optional auth - doesn't require token but attaches user if present
 * Useful for endpoints that behave differently for authenticated users
 * @middleware
 */
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }
    
    const token = authHeader.split(' ')[1];

    if (!token || isTokenBlacklisted(token)) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256']
        });
        
        if (!decoded.id || !decoded.email || !decoded.role) {
            req.user = null;
            return next();
        }
        
        const user = await User.findById(decoded.id);
        if (user && user.isActive()) {
            req.user = {
                id: user.getId(),
                email: user.getEmail(),
                role: user.getRole()
            };
        } else {
            req.user = null;
        }
    } catch (error) {
        req.user = null;
    }
    
    next();
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
                error: 'Authentication required.'
            });
        }
        
        if (!req.user.role) {
            return res.status(403).json({
                success: false,
                error: 'User role not found.'
            });
        }
        
        if (!Array.isArray(roles) || roles.length === 0) {
            console.warn('authorize() called with no roles specified');
            return res.status(500).json({
                success: false,
                error: 'Server configuration error.'
            });
        }
        
        if (!roles.includes(req.user.role)) {
            // Log unauthorized access attempt for security monitoring
            console.warn(`Unauthorized access attempt: User ${req.user.id} with role '${req.user.role}' tried to access resource requiring: ${roles.join(' or ')}`);
            
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions for this action.'
            });
        }
        
        next();
    };
};

/**
 * Refresh token - generates new token before current one expires
 * @param {string} token - Current valid token
 * @returns {string} New JWT token
 */
const refreshToken = (token) => {
    if (!token || isTokenBlacklisted(token)) {
        throw new Error('Invalid or revoked token');
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256']
        });
        
        // Generate new token with same user data
        return generateToken(decoded.id, decoded.email, decoded.role);
    } catch (error) {
        throw new Error('Cannot refresh: ' + (error.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token'));
    }
};

module.exports = {
    authenticateToken,
    authorize,
    generateToken,
    revokeToken,
    refreshToken,
    optionalAuth,
    isTokenBlacklisted
};