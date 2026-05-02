// backend/src/controllers/notificationController.js


const pool = require('../db/pool');

const notificationController = {
    /**
     * GET /api/notifications
     * Get user notifications
     */
    async getNotifications(req, res) {
        const userId = req.user.id;
        const { limit = 50, include_read = false } = req.query;
        
        try {
            let query = `
                SELECT * FROM notifications 
                WHERE user_id = $1
            `;
            const params = [userId];
            let paramCount = 2;
            
            if (!include_read || include_read === 'false') {
                query += ` AND is_read = false`;
            }
            
            query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
            params.push(limit);
            
            const result = await pool.query(query, params);
            
            res.status(200).json({
                success: true,
                data: result.rows,
                count: result.rows.length,
                unread_count: result.rows.filter(n => !n.is_read).length
            });
        } catch (error) {
            console.error('Failed to get notifications:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * GET /api/notifications/unread/count
     * Get unread notification count
     */
    async getUnreadCount(req, res) {
        const userId = req.user.id;
        
        try {
            const result = await pool.query(
                `SELECT COUNT(*) as count FROM notifications 
                 WHERE user_id = $1 AND is_read = false`,
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
     * PUT /api/notifications/:id/read
     * Mark notification as read
     */
    async markAsRead(req, res) {
        const notificationId = parseInt(req.params.id);
        const userId = req.user.id;
        
        try {
            const result = await pool.query(
                `UPDATE notifications 
                 SET is_read = true, read_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND user_id = $2
                 RETURNING id`,
                [notificationId, userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Notification not found' });
            }
            
            res.status(200).json({
                success: true,
                message: 'Notification marked as read'
            });
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * PUT /api/notifications/read/all
     * Mark all notifications as read
     */
    async markAllAsRead(req, res) {
        const userId = req.user.id;
        
        try {
            await pool.query(
                `UPDATE notifications 
                 SET is_read = true, read_at = CURRENT_TIMESTAMP
                 WHERE user_id = $1 AND is_read = false`,
                [userId]
            );
            
            res.status(200).json({
                success: true,
                message: 'All notifications marked as read'
            });
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * Create a notification (internal use)
     * @param {number} userId - User ID to notify
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     */
    async createNotification(userId, title, message, type = 'system') {
        try {
            await pool.query(
                `INSERT INTO notifications (user_id, title, message, type)
                 VALUES ($1, $2, $3, $4)`,
                [userId, title, message, type]
            );
        } catch (error) {
            console.error('Failed to create notification:', error);
        }
    }
};

module.exports = notificationController;