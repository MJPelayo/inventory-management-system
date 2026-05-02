// backend/src/routes/messageRoutes.js
/**
 * Internal Message Routes
 * Handles cross-role chat/communication
 * 
 * All routes require authentication
 * 
 * @module routes/messageRoutes
 */

const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');

// ============================================
// MESSAGES (Authenticated users)
// ============================================

// Get user's messages (both sent and received)
router.get('/',
    authenticateToken,
    messageController.getMessages
);

// Send a new message
router.post('/',
    authenticateToken,
    messageController.sendMessage
);

// Get unread message count
router.get('/unread',
    authenticateToken,
    messageController.getUnreadCount
);

// Mark message as read
router.put('/:id/read',
    authenticateToken,
    messageController.markAsRead
);

// Get conversation with specific user
router.get('/conversation/:userId',
    authenticateToken,
    messageController.getConversation
);

module.exports = router;