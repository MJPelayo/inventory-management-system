// backend/src/routes/settingsRoutes.js
/**
 * System Settings Routes
 * Handles system configuration (tax, thresholds, etc.)
 * 
 * All routes require authentication and admin role
 * 
 * @module routes/settingsRoutes
 */

const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken, authorize } = require('../middleware/auth');

// ============================================
// SYSTEM SETTINGS (Admin only)
// ============================================

// Get all system settings
router.get('/system',
    authenticateToken,
    authorize('admin'),
    settingsController.getSystemSettings
);

// Get single system setting
router.get('/system/:key',
    authenticateToken,
    authorize('admin'),
    settingsController.getSystemSetting
);

// Update system settings
router.put('/system',
    authenticateToken,
    authorize('admin'),
    settingsController.updateSystemSettings
);

module.exports = router;