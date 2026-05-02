// backend/src/routes/notificationRoutes.js
/**
 * Notification Routes
 * Handles user notifications
 * 
 * All routes require authentication
 * 
 * @module routes/notificationRoutes
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

// ============================================
// NOTIFICATIONS (Authenticated users)
// ============================================

// Get user notifications
router.get('/',
    authenticateToken,
    notificationController.getNotifications
);

// Get unread notification count
router.get('/unread/count',
    authenticateToken,
    notificationController.getUnreadCount
);

// Mark notification as read
router.put('/:id/read',
    authenticateToken,
    notificationController.markAsRead
);

// Mark all notifications as read
router.put('/read/all',
    authenticateToken,
    notificationController.markAllAsRead
);

module.exports = router;
