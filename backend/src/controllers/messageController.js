// backend/src/controllers/messageController.js

const pool = require('../db/pool');

const messageController = {
    /**
     * GET /api/messages
     * Get user's messages (both sent and received)
     */
    async getMessages(req, res) {
        const userId = req.user.id;
        const { limit = 50 } = req.query;
        
        try {
            const result = await pool.query(
                `SELECT 
                    im.*,
                    u.name as sender_name,
                    u.role as sender_role
                 FROM internal_messages im
                 LEFT JOIN users u ON im.sender_id = u.id
                 WHERE im.recipient_id = $1 OR im.sender_id = $1
                 ORDER BY im.created_at DESC
                 LIMIT $2`,
                [userId, limit]
            );
            
            res.status(200).json({
                success: true,
                data: result.rows,
                count: result.rows.length
            });
        } catch (error) {
            console.error('Failed to get messages:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * POST /api/messages
     * Send a new message
     */
    async sendMessage(req, res) {
        const { recipient_role, recipient_id, subject, message } = req.body;
        const senderId = req.user.id;
        const senderName = req.user.name;
        const senderRole = req.user.role;
        
        if (!message) {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }
        
        try {
            let recipientId = recipient_id;
            let recipientRole = recipient_role;
            
            // If sending to role, find a user with that role
            if (recipientRole && !recipientId) {
                const userResult = await pool.query(
                    `SELECT id FROM users WHERE role = $1 AND is_active = true LIMIT 1`,
                    [recipientRole]
                );
                if (userResult.rows.length > 0) {
                    recipientId = userResult.rows[0].id;
                }
            }
            
            const result = await pool.query(
                `INSERT INTO internal_messages (sender_id, sender_name, sender_role, recipient_role, recipient_id, subject, message)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [senderId, senderName, senderRole, recipientRole, recipientId, subject || null, message]
            );
            
            // Create notification for recipient
            if (recipientId) {
                await pool.query(
                    `INSERT INTO notifications (user_id, title, message, type)
                     VALUES ($1, $2, $3, $4)`,
                    [recipientId, `New message from ${senderName}`, subject || message.substring(0, 100), 'message']
                );
            }
            
            res.status(201).json({
                success: true,
                data: result.rows[0],
                message: 'Message sent successfully'
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * GET /api/messages/unread
     * Get unread message count
     */
    async getUnreadCount(req, res) {
        const userId = req.user.id;
        
        try {
            const result = await pool.query(
                `SELECT COUNT(*) as count 
                 FROM internal_messages 
                 WHERE recipient_id = $1 AND is_read = false`,
                [userId]
            );
            
            res.status(200).json({
                success: true,
                count: parseInt(result.rows[0].count)
            });
        } catch (error) {
            console.error('Failed to get unread count:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * PUT /api/messages/:id/read
     * Mark message as read
     */
    async markAsRead(req, res) {
        const messageId = parseInt(req.params.id);
        const userId = req.user.id;
        
        try {
            const result = await pool.query(
                `UPDATE internal_messages 
                 SET is_read = true, read_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND recipient_id = $2
                 RETURNING id`,
                [messageId, userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Message not found' });
            }
            
            res.status(200).json({
                success: true,
                message: 'Message marked as read'
            });
        } catch (error) {
            console.error('Failed to mark message as read:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * GET /api/messages/conversation/:userId
     * Get conversation between current user and another user
     */
    async getConversation(req, res) {
        const userId = req.user.id;
        const otherUserId = parseInt(req.params.userId);
        const { limit = 50 } = req.query;
        
        try {
            const result = await pool.query(
                `SELECT 
                    im.*,
                    u.name as sender_name,
                    u.role as sender_role
                 FROM internal_messages im
                 LEFT JOIN users u ON im.sender_id = u.id
                 WHERE (im.sender_id = $1 AND im.recipient_id = $2)
                    OR (im.sender_id = $2 AND im.recipient_id = $1)
                 ORDER BY im.created_at ASC
                 LIMIT $3`,
                [userId, otherUserId, limit]
            );
            
            // Mark messages from other user as read
            await pool.query(
                `UPDATE internal_messages 
                 SET is_read = true, read_at = CURRENT_TIMESTAMP
                 WHERE sender_id = $1 AND recipient_id = $2 AND is_read = false`,
                [otherUserId, userId]
            );
            
            res.status(200).json({
                success: true,
                data: result.rows,
                count: result.rows.length
            });
        } catch (error) {
            console.error('Failed to get conversation:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = messageController;