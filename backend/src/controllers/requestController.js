// backend/src/controllers/requestController.js


const pool = require('../db/pool');

const requestController = {
    /**
     * GET /api/requests
     * Get pending requests (filtered by user role)
     */
    async getRequests(req, res) {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { status = 'pending', limit = 50 } = req.query;
        
        try {
            let query = `
                SELECT ir.*,
                       u.name as requester_name,
                       u.role as requester_role,
                       ru.name as resolver_name
                FROM internal_requests ir
                LEFT JOIN users u ON ir.requested_by = u.id
                LEFT JOIN users ru ON ir.resolved_by = ru.id
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 1;
            
            // Filter by status
            query += ` AND ir.status = $${paramCount++}`;
            params.push(status);
            
            // Filter by role - users can see requests they made or requests targeting their role
            if (userRole !== 'admin') {
                query += ` AND (ir.requested_by = $${paramCount++} OR ir.target_role = $${paramCount++})`;
                params.push(userId, userRole);
            }
            
            query += ` ORDER BY ir.created_at DESC LIMIT $${paramCount++}`;
            params.push(limit);
            
            const result = await pool.query(query, params);
            
            res.status(200).json({
                success: true,
                data: result.rows,
                count: result.rows.length
            });
        } catch (error) {
            console.error('Failed to get requests:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * POST /api/requests
     * Create a new internal request
     */
    async createRequest(req, res) {
        const { request_type, entity_type, entity_id, entity_name, reason, target_role } = req.body;
        const userId = req.user.id;
        const userName = req.user.name;
        
        if (!request_type || !reason) {
            return res.status(400).json({ success: false, error: 'Request type and reason are required' });
        }
        
        try {
            const result = await pool.query(
                `INSERT INTO internal_requests 
                 (request_type, entity_type, entity_id, entity_name, reason, requested_by, requested_by_name, target_role)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [request_type, entity_type, entity_id, entity_name, reason, userId, userName, target_role || 'admin']
            );
            
            // Create notification for target role users
            if (target_role) {
                await pool.query(
                    `INSERT INTO notifications (user_id, title, message, type)
                     SELECT id, $1, $2, 'request'
                     FROM users WHERE role = $3 AND is_active = true`,
                    [`New ${request_type} request`, `${userName} requested: ${reason.substring(0, 200)}`, target_role]
                );
            }
            
            res.status(201).json({
                success: true,
                data: result.rows[0],
                message: 'Request submitted successfully'
            });
        } catch (error) {
            console.error('Failed to create request:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * POST /api/requests/:id/approve
     * Approve a pending request (admin only)
     */
    async approveRequest(req, res) {
        const requestId = parseInt(req.params.id);
        const adminId = req.user.id;
        const adminName = req.user.name;
        const { admin_notes } = req.body;
        
        try {
            // Get request details
            const requestResult = await pool.query(
                `SELECT * FROM internal_requests WHERE id = $1 AND status = 'pending'`,
                [requestId]
            );
            
            if (requestResult.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Request not found or already processed' });
            }
            
            const request = requestResult.rows[0];
            
            await pool.query('BEGIN');
            
            // Update request status
            await pool.query(
                `UPDATE internal_requests 
                 SET status = 'approved', admin_notes = $1, resolved_by = $2, resolved_at = CURRENT_TIMESTAMP
                 WHERE id = $3`,
                [admin_notes || null, adminId, requestId]
            );
            
            // Execute the approved action based on request type
            if (request.request_type === 'DELETE_SUPPLIER' && request.entity_type === 'supplier') {
                // Soft delete supplier
                await pool.query(
                    `UPDATE suppliers SET is_active = false WHERE id = $1`,
                    [request.entity_id]
                );
                
                // Notify requester
                await pool.query(
                    `INSERT INTO notifications (user_id, title, message, type)
                     VALUES ($1, $2, $3, 'approval')`,
                    [request.requested_by, 'Request Approved', `Your request to delete ${request.entity_name} has been approved by ${adminName}`]
                );
            }
            
            await pool.query('COMMIT');
            
            res.status(200).json({
                success: true,
                message: 'Request approved successfully'
            });
        } catch (error) {
            await pool.query('ROLLBACK');
            console.error('Failed to approve request:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * POST /api/requests/:id/deny
     * Deny a pending request (admin only)
     */
    async denyRequest(req, res) {
        const requestId = parseInt(req.params.id);
        const adminId = req.user.id;
        const adminName = req.user.name;
        const { rejection_reason } = req.body;
        
        if (!rejection_reason) {
            return res.status(400).json({ success: false, error: 'Rejection reason is required' });
        }
        
        try {
            const requestResult = await pool.query(
                `SELECT * FROM internal_requests WHERE id = $1 AND status = 'pending'`,
                [requestId]
            );
            
            if (requestResult.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Request not found or already processed' });
            }
            
            const request = requestResult.rows[0];
            
            await pool.query('BEGIN');
            
            // Update request status
            await pool.query(
                `UPDATE internal_requests 
                 SET status = 'denied', admin_notes = $1, resolved_by = $2, resolved_at = CURRENT_TIMESTAMP
                 WHERE id = $3`,
                [rejection_reason, adminId, requestId]
            );
            
            // Notify requester
            await pool.query(
                `INSERT INTO notifications (user_id, title, message, type)
                 VALUES ($1, $2, $3, 'rejection')`,
                [request.requested_by, 'Request Denied', `Your request for ${request.entity_name || request.request_type} was denied by ${adminName}. Reason: ${rejection_reason}`]
            );
            
            await pool.query('COMMIT');
            
            res.status(200).json({
                success: true,
                message: 'Request denied'
            });
        } catch (error) {
            await pool.query('ROLLBACK');
            console.error('Failed to deny request:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * GET /api/requests/my
     * Get requests made by current user
     */
    async getMyRequests(req, res) {
        const userId = req.user.id;
        const { limit = 50 } = req.query;
        
        try {
            const result = await pool.query(
                `SELECT ir.*, ru.name as resolver_name
                 FROM internal_requests ir
                 LEFT JOIN users ru ON ir.resolved_by = ru.id
                 WHERE ir.requested_by = $1
                 ORDER BY ir.created_at DESC
                 LIMIT $2`,
                [userId, limit]
            );
            
            res.status(200).json({
                success: true,
                data: result.rows,
                count: result.rows.length
            });
        } catch (error) {
            console.error('Failed to get user requests:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = requestController;