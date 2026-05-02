// backend/src/controllers/permissionController.js


const pool = require('../db/pool');

const permissionController = {
    // ============================================
    // USER PERMISSIONS (HIGH PRIORITY)
    // ============================================
    
    /**
     * GET /api/users/:id/permissions
     * Get user permissions (custom overrides + role defaults)
     * 
     * @param {number} req.params.id - User ID
     */
    async getUserPermissions(req, res) {
        const userId = parseInt(req.params.id);
        
        try {
            // Get custom permissions for this user
            const customResult = await pool.query(
                `SELECT module, permission FROM user_permissions 
                 WHERE user_id = $1`,
                [userId]
            );
            
            // Get user's role
            const userResult = await pool.query(
                `SELECT role FROM users WHERE id = $1`,
                [userId]
            );
            
            if (userResult.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            
            const userRole = userResult.rows[0].role;
            
            // Get all possible modules
            const modules = ['products', 'suppliers', 'warehouses', 'users', 'reports', 'orders', 'inventory', 'settings'];
            
            // Build permissions object - custom overrides take precedence
            const permissions = {};
            for (const module of modules) {
                // Check for custom override
                const custom = customResult.rows.find(r => r.module === module);
                if (custom) {
                    permissions[module] = custom.permission;
                } else {
                    // Use role default (none for most, will be set via settings)
                    permissions[module] = 'none';
                }
            }
            
            res.status(200).json({
                success: true,
                data: permissions,
                role: userRole,
                message: 'User permissions retrieved successfully'
            });
        } catch (error) {
            console.error('Failed to get user permissions:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * PUT /api/users/:id/permissions
     * Update user permissions (overrides role defaults)
     * 
     * @param {number} req.params.id - User ID
     * @param {Object} req.body.permissions - { module: permission_level }
     */
    async updateUserPermissions(req, res) {
        const userId = parseInt(req.params.id);
        const { permissions } = req.body;
        const adminId = req.user.id;
        
        try {
            // Check if user is protected
            const userCheck = await pool.query(
                'SELECT is_protected, role FROM users WHERE id = $1',
                [userId]
            );
            
            if (userCheck.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            
            // Protected users cannot have their permissions modified by others
            if (userCheck.rows[0].is_protected && adminId !== userId) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Cannot modify permissions of protected admin account' 
                });
            }
            
            await pool.query('BEGIN');
            
            for (const [module, permission] of Object.entries(permissions)) {
                // Get old permission for audit log
                const oldResult = await pool.query(
                    `SELECT permission FROM user_permissions 
                     WHERE user_id = $1 AND module = $2`,
                    [userId, module]
                );
                const oldPermission = oldResult.rows[0]?.permission || null;
                
                if (permission === 'default' || permission === 'none') {
                    // Remove custom override
                    await pool.query(
                        `DELETE FROM user_permissions WHERE user_id = $1 AND module = $2`,
                        [userId, module]
                    );
                } else {
                    // Upsert custom permission
                    await pool.query(
                        `INSERT INTO user_permissions (user_id, module, permission)
                         VALUES ($1, $2, $3)
                         ON CONFLICT (user_id, module) 
                         DO UPDATE SET permission = EXCLUDED.permission, updated_at = CURRENT_TIMESTAMP`,
                        [userId, module, permission]
                    );
                }
                
                // Log the change
                await pool.query(
                    `INSERT INTO permission_audit_log (changed_by, changed_for, module, old_permission, new_permission)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [adminId, userId, module, oldPermission, permission === 'default' ? null : permission]
                );
            }
            
            await pool.query('COMMIT');
            
            // Also log to main audit log
            await pool.query(
                `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data)
                 VALUES ($1, $2, $3, $4, $5)`,
                [adminId, 'update_permissions', 'user', userId, JSON.stringify(permissions)]
            );
            
            res.status(200).json({
                success: true,
                message: 'User permissions updated successfully'
            });
        } catch (error) {
            await pool.query('ROLLBACK');
            console.error('Failed to update user permissions:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * POST /api/users/:id/permissions/reset
     * Reset user permissions to role defaults
     * 
     * @param {number} req.params.id - User ID
     */
    async resetUserPermissions(req, res) {
        const userId = parseInt(req.params.id);
        const adminId = req.user.id;
        
        try {
            // Check if user is protected
            const userCheck = await pool.query(
                'SELECT is_protected FROM users WHERE id = $1',
                [userId]
            );
            
            if (userCheck.rows[0]?.is_protected && adminId !== userId) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Cannot reset permissions of protected admin account' 
                });
            }
            
            // Remove all custom permissions
            const deleted = await pool.query(
                `DELETE FROM user_permissions WHERE user_id = $1 RETURNING module, permission`,
                [userId]
            );
            
            // Log each deletion
            for (const row of deleted.rows) {
                await pool.query(
                    `INSERT INTO permission_audit_log (changed_by, changed_for, module, old_permission, new_permission)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [adminId, userId, row.module, row.permission, null]
                );
            }
            
            res.status(200).json({
                success: true,
                message: 'User permissions reset to role defaults'
            });
        } catch (error) {
            console.error('Failed to reset user permissions:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    // ============================================
    // ROLE DEFAULTS (HIGH PRIORITY)
    // ============================================
    
    /**
     * GET /api/settings/role-defaults
     * Get role default permissions
     */
    async getRoleDefaults(req, res) {
        try {
            const result = await pool.query(
                `SELECT role, module, permission FROM role_default_permissions`
            );
            
            // Organize by role
            const defaults = {
                admin: {},
                sales: {},
                warehouse: {},
                supply: {}
            };
            
            for (const row of result.rows) {
                if (defaults[row.role]) {
                    defaults[row.role][row.module] = row.permission;
                }
            }
            
            res.status(200).json({
                success: true,
                data: defaults
            });
        } catch (error) {
            console.error('Failed to get role defaults:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * PUT /api/settings/role-defaults
     * Update role default permissions
     */
    async updateRoleDefaults(req, res) {
        const { roleDefaults } = req.body;
        const adminId = req.user.id;
        
        try {
            await pool.query('BEGIN');
            
            for (const [role, modules] of Object.entries(roleDefaults)) {
                for (const [module, permission] of Object.entries(modules)) {
                    await pool.query(
                        `INSERT INTO role_default_permissions (role, module, permission)
                         VALUES ($1, $2, $3)
                         ON CONFLICT (role, module) 
                         DO UPDATE SET permission = EXCLUDED.permission`,
                        [role, module, permission]
                    );
                }
            }
            
            // Log to audit
            await pool.query(
                `INSERT INTO audit_logs (user_id, action, entity_type, new_data)
                 VALUES ($1, $2, $3, $4)`,
                [adminId, 'update_role_defaults', 'settings', JSON.stringify(roleDefaults)]
            );
            
            await pool.query('COMMIT');
            
            res.status(200).json({
                success: true,
                message: 'Role defaults updated successfully'
            });
        } catch (error) {
            await pool.query('ROLLBACK');
            console.error('Failed to update role defaults:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    // ============================================
    // PERMISSION AUDIT (HIGH PRIORITY)
    // ============================================
    
    /**
     * GET /api/audit/permissions
     * View permission change history
     */
    async getPermissionAuditLog(req, res) {
        try {
            const { limit = 100, user_id } = req.query;
            
            let query = `
                SELECT 
                    pal.*,
                    cb.name as changed_by_name,
                    cb.role as changed_by_role,
                    cf.name as changed_for_name,
                    cf.role as changed_for_role
                FROM permission_audit_log pal
                LEFT JOIN users cb ON pal.changed_by = cb.id
                LEFT JOIN users cf ON pal.changed_for = cf.id
                WHERE 1=1
            `;
            
            const params = [];
            let paramCount = 1;
            
            if (user_id) {
                query += ` AND pal.changed_for = $${paramCount++}`;
                params.push(user_id);
            }
            
            query += ` ORDER BY pal.changed_at DESC LIMIT $${paramCount++}`;
            params.push(limit);
            
            const result = await pool.query(query, params);
            
            res.status(200).json({
                success: true,
                data: result.rows,
                count: result.rows.length
            });
        } catch (error) {
            console.error('Failed to get permission audit log:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    // ============================================
    // PERMISSION CHECK HELPER (For middleware)
    // ============================================
    
    /**
     * Check if user has permission for a module/action
     * @param {number} userId - User ID
     * @param {string} module - Module name
     * @param {string} action - Action (read, create, edit, delete)
     * @returns {Promise<boolean>}
     */
    async checkPermission(userId, module, action) {
        try {
            // Check custom permission first
            const customResult = await pool.query(
                `SELECT permission FROM user_permissions 
                 WHERE user_id = $1 AND module = $2`,
                [userId, module]
            );
            
            let permissionLevel = customResult.rows[0]?.permission;
            
            if (!permissionLevel) {
                // Fall back to role default
                const userResult = await pool.query(
                    `SELECT u.role, rp.permission 
                     FROM users u
                     LEFT JOIN role_default_permissions rp ON u.role = rp.role AND rp.module = $2
                     WHERE u.id = $1`,
                    [userId, module]
                );
                permissionLevel = userResult.rows[0]?.permission || 'none';
            }
            
            // Map permission level to allowed actions
            const permissionMap = {
                'none': [],
                'read': ['read'],
                'create': ['read', 'create'],
                'edit': ['read', 'create', 'edit'],
                'delete': ['read', 'create', 'edit', 'delete'],
                'full': ['read', 'create', 'edit', 'delete', 'manage']
            };
            
            return permissionMap[permissionLevel]?.includes(action) || false;
        } catch (error) {
            console.error('Permission check failed:', error);
            return false;
        }
    }
};

module.exports = permissionController;