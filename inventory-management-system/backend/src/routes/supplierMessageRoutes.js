// backend/src/routes/supplierMessageRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllMessages,
    getMessageById,
    sendMessage,
    replyToMessage,
    updateMessageStatus,
    deleteMessage,
    getMessageStats
} = require('../controllers/supplierMessageController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// GET /api/supplier-messages - Get all messages (sales_manager, supply, admin)
router.get('/', 
    authorize('supplier:read', 'supplier:communicate', 'report:view_all'), 
    getAllMessages
);

// GET /api/supplier-messages/stats - Get message statistics
router.get('/stats', 
    authorize('supplier:read', 'supplier:communicate', 'report:view_all'), 
    getMessageStats
);

// GET /api/supplier-messages/:id - Get single message
router.get('/:id', 
    authorize('supplier:read', 'supplier:communicate'), 
    getMessageById
);

// POST /api/supplier-messages - Send new message
router.post('/', 
    authorize('supplier:communicate', 'supplier:create'), 
    sendMessage
);

// PUT /api/supplier-messages/:id/reply - Reply to a message
router.put('/:id/reply', 
    authorize('supplier:communicate'), 
    replyToMessage
);

// PATCH /api/supplier-messages/:id/status - Update message status
router.patch('/:id/status', 
    authorize('supplier:communicate', 'supplier:update'), 
    updateMessageStatus
);

// DELETE /api/supplier-messages/:id - Delete message
router.delete('/:id', 
    authorize('supplier:communicate', 'supplier:update'), 
    deleteMessage
);

module.exports = router;