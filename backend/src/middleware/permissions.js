// backend/src/middleware/permissions.js

/**
 * Check if user has permission for a specific action
 * @param {string} module - Module name (products, suppliers, etc.)
 * @param {string} action - Action (read, create, edit, delete)
 * @returns {boolean}
 */
async function hasPermission(userId, module, action) {
    const client = await pool.connect();
    try {
        // Check if user has custom permissions
        const permResult = await client.query(
            'SELECT permission FROM user_permissions WHERE user_id = $1 AND module = $2',
            [userId, module]
        );
        
        if (permResult.rows.length > 0) {
            const level = permResult.rows[0].permission;
            const permissionMap = {
                'none': [],
                'read': ['read'],
                'create': ['read', 'create'],
                'edit': ['read', 'create', 'edit'],
                'delete': ['read', 'create', 'edit', 'delete'],
                'full': ['read', 'create', 'edit', 'delete', 'manage_permissions']
            };
            return permissionMap[level]?.includes(action) || false;
        }
        
        // Fallback to role-based permissions
        const userResult = await client.query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
        );
        const role = userResult.rows[0]?.role;
        
        const rolePermissions = {
            'admin': { read: true, create: true, edit: true, delete: true },
            'sales': { read: true, create: true, edit: false, delete: false },
            'warehouse': { read: true, create: true, edit: true, delete: false },
            'supply': { read: true, create: true, edit: true, delete: false }
        };
        
        return rolePermissions[role]?.[action] || false;
        
    } finally {
        client.release();
    }
}

/**
 * Middleware to check specific permission
 * @param {string} module - Module name
 * @param {string} action - Action required
 */
function requirePermission(module, action) {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            
            const hasAccess = await hasPermission(userId, module, action);
            if (!hasAccess) {
                return res.status(403).json({ 
                    success: false, 
                    error: `You don't have permission to ${action} ${module}` 
                });
            }
            
            next();
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
}

/**
 * Check if user can delete target user (protected account check)
 */
async function canDeleteUser(adminId, targetUserId) {
    const client = await pool.connect();
    try {
        // Check if target is protected
        const targetResult = await client.query(
            'SELECT is_protected, email FROM users WHERE id = $1',
            [targetUserId]
        );
        
        if (targetResult.rows[0]?.is_protected) {
            // Only the same user can delete themselves (or maybe never)
            return adminId === targetUserId;
        }
        
        // Check if admin has delete permission for users module
        return await hasPermission(adminId, 'users', 'delete');
        
    } finally {
        client.release();
    }
}

module.exports = { hasPermission, requirePermission, canDeleteUser };