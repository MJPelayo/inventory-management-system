// backend/src/middleware/authMiddleware.js
const { User } = require('../models/User');

// Role definitions with their permissions
const ROLE_PERMISSIONS = {
    admin: {
        level: 4,
        permissions: [
            // User management
            'user:create', 'user:read', 'user:update', 'user:delete',
            // Product management
            'product:create', 'product:read', 'product:update', 'product:delete',
            // Warehouse management
            'warehouse:create', 'warehouse:read', 'warehouse:update', 'warehouse:delete',
            // Order management
            'order:create', 'order:read', 'order:update', 'order:delete',
            'order:approve_discount', 'order:cancel',
            // Supply management
            'supply:create', 'supply:read', 'supply:update', 'supply:delete',
            // Reports
            'report:view_all', 'report:export',
            // System
            'system:settings', 'system:logs'
        ],
        routes: ['*'] // Access to all routes
    },
    sales: {
        level: 2,
        permissions: [
            // Products - read only
            'product:read',
            // Orders
            'order:create', 'order:read', 'order:update',
            'order:request_discount',
            // Customers
            'customer:create', 'customer:read', 'customer:update',
            // Reports - own only
            'report:view_own'
        ],
        routes: ['products', 'orders', 'customers', 'reports/own']
    },
    warehouse: {
        level: 2,
        permissions: [
            // Products - read and update stock
            'product:read', 'product:update_stock',
            // Warehouse
            'warehouse:read', 'warehouse:update_stock',
            // Stock movements
            'stock:receive', 'stock:transfer', 'stock:adjust', 'stock:read',
            // Inventory
            'inventory:read', 'inventory:update',
            // Reports - warehouse only
            'report:view_warehouse'
        ],
        routes: ['products', 'warehouses', 'inventory', 'stock', 'reports/warehouse']
    },
    supply: {
        level: 2,
        permissions: [
            // Suppliers
            'supplier:create', 'supplier:read', 'supplier:update',
            // Purchase orders
            'supply:create', 'supply:read', 'supply:update',
            // Products - read
            'product:read',
            // Reports - supply only
            'report:view_supply'
        ],
        routes: ['suppliers', 'supply-orders', 'products', 'reports/supply']
    },
    sales_manager: {
        level: 3,
        permissions: [
            // Products - read and discount management
            'product:read', 'product:update_discount',
            // Supplier communication
            'supplier:read', 'supplier:communicate',
            // Orders - full access
            'order:create', 'order:read', 'order:update', 'order:delete',
            'order:approve_discount', 'order:request_discount',
            // Warehouse transactions view
            'warehouse:read_transactions', 'stock:read',
            // Customer management
            'customer:create', 'customer:read', 'customer:update',
            // Discount management
            'discount:create', 'discount:read', 'discount:update', 'discount:delete',
            // Reports
            'report:view_sales', 'report:view_all', 'report:export'
        ],
        routes: ['products', 'orders', 'customers', 'suppliers', 'supplier-messages', 'discounts', 'warehouse-transactions', 'reports']
    }
};

// Extract token from request headers
const extractToken = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    // Also support simple token auth for demo
    return authHeader;
};

// Authentication middleware - verifies user is logged in
const authenticate = async (req, res, next) => {
    try {
        const token = extractToken(req);
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'No authentication token provided'
            });
        }

        // For demo purposes, token is the user email
        // In production, this would be a JWT or session ID
        const user = await User.findByEmail(token);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid authentication',
                message: 'User not found with provided token'
            });
        }

        if (!user.isActive()) {
            return res.status(403).json({
                success: false,
                error: 'Account deactivated',
                message: 'Your account has been deactivated'
            });
        }

        // Attach user to request
        req.user = user;
        req.userPermissions = ROLE_PERMISSIONS[user.getRole()] || ROLE_PERMISSIONS.sales;
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed',
            message: error.message
        });
    }
};

// Authorization middleware - checks if user has specific permission
const authorize = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'Please log in first'
            });
        }

        const userRole = req.user.getRole();
        const userPerms = ROLE_PERMISSIONS[userRole];

        if (!userPerms) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'Unknown role assigned to user'
            });
        }

        // Check if user has any of the required permissions
        const hasPermission = requiredPermissions.some(perm => 
            userPerms.permissions.includes(perm) || userPerms.routes.includes('*')
        );

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: `You don't have permission to perform this action. Required: ${requiredPermissions.join(' or ')}`
            });
        }

        next();
    };
};

// Role-based route access middleware
const restrictToRoutes = (...allowedRoutePrefixes) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const userRole = req.user.getRole();
        const userPerms = ROLE_PERMISSIONS[userRole];

        // Admin has access to everything
        if (userPerms.routes.includes('*')) {
            return next();
        }

        const currentPath = req.path;
        
        // Check if current path starts with any allowed prefix
        const isAllowed = allowedRoutePrefixes.some(prefix => 
            currentPath.startsWith('/' + prefix) || currentPath.startsWith(prefix)
        );

        if (!isAllowed) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: `Your role (${userRole}) doesn't have access to this section`
            });
        }

        next();
    };
};

// Get user permissions helper
const getUserPermissions = (role) => {
    return ROLE_PERMISSIONS[role] || null;
};

// Check if user has permission
const hasPermission = (user, permission) => {
    if (!user) return false;
    const role = user.getRole();
    const perms = ROLE_PERMISSIONS[role];
    return perms ? perms.permissions.includes(permission) : false;
};

// Get accessible routes for a role
const getAccessibleRoutes = (role) => {
    const perms = ROLE_PERMISSIONS[role];
    if (!perms) return [];
    return perms.routes;
};

module.exports = {
    authenticate,
    authorize,
    restrictToRoutes,
    getUserPermissions,
    hasPermission,
    getAccessibleRoutes,
    ROLE_PERMISSIONS,
    extractToken
};