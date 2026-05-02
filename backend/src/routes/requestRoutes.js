// backend/src/routes/requestRoutes.js
/**
 * Internal Request Routes
 * Handles cross-role requests (deletion, approvals, etc.)
 * 
 * All routes require authentication
 * Approval/deny routes require admin role
 * 
 * @module routes/requestRoutes
 */

const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authenticateToken, authorize } = require('../middleware/auth');

// ============================================
// REQUESTS (Authenticated users)
// ============================================

// Get all requests (filtered by role)
router.get('/',
    authenticateToken,
    requestController.getRequests
);

// Get requests made by current user
router.get('/my',
    authenticateToken,
    requestController.getMyRequests
);

// Create a new request
router.post('/',
    authenticateToken,
    requestController.createRequest
);

// ============================================
// REQUEST APPROVAL/DENIAL (Admin only)
// ============================================

// Approve a request
router.post('/:id/approve',
    authenticateToken,
    authorize('admin'),
    requestController.approveRequest
);

// Deny a request
router.post('/:id/deny',
    authenticateToken,
    authorize('admin'),
    requestController.denyRequest
);

module.exports = router;