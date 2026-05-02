// backend/src/routes/permissionRoutes.js
/**
 * Permission Routes
 * Handles user permissions, role defaults, and audit logs
 * 
 * All routes require authentication
 * Most routes require admin role
 * 
 * @module routes/permissionRoutes
 */

const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { authenticateToken, authorize } = require('../middleware/auth');

// ============================================
// USER PERMISSIONS (Admin only)
// ============================================

// Get user permissions
router.get('/users/:id/permissions',
    authenticateToken,
    authorize('admin'),
    permissionController.getUserPermissions
);

// Update user permissions
router.put('/users/:id/permissions',
    authenticateToken,
    authorize('admin'),
    permissionController.updateUserPermissions
);

// Reset user permissions to role defaults
router.post('/users/:id/permissions/reset',
    authenticateToken,
    authorize('admin'),
    permissionController.resetUserPermissions
);

// ============================================
// ROLE DEFAULTS (Admin only)
// ============================================

// Get role default permissions
router.get('/settings/role-defaults',
    authenticateToken,
    authorize('admin'),
    permissionController.getRoleDefaults
);

// Update role default permissions
router.put('/settings/role-defaults',
    authenticateToken,
    authorize('admin'),
    permissionController.updateRoleDefaults
);

// ============================================
// PERMISSION AUDIT (Admin only)
// ============================================

// Get permission change history
router.get('/audit/permissions',
    authenticateToken,
    authorize('admin'),
    permissionController.getPermissionAuditLog
);

module.exports = router;