/**
 * Audit Log Controller
 * Handles retrieval of audit logs
 * 
 * @module controllers/auditLogController
 */

const pool = require('../db/pool');

const auditLogController = {
    /**
     * Get recent audit logs
     * GET /api/audit-logs
     */
    async getAuditLogs(req, res) {
        try {
            const { limit = 50, entity_type, user_id } = req.query;
            
            let query = `
                SELECT 
                    al.id,
                    al.action,
                    al.entity_type,
                    al.entity_id,
                    al.old_data,
                    al.new_data,
                    al.ip_address,
                    al.user_agent,
                    al.created_at as timestamp,
                    u.id as user_id,
                    u.name as user_name,
                    u.email as user_email,
                    u.role as user_role
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE 1=1
            `;
            
            const params = [];
            let paramCount = 1;
            
            if (entity_type) {
                query += ` AND al.entity_type = $${paramCount++}`;
                params.push(entity_type);
            }
            
            if (user_id) {
                query += ` AND al.user_id = $${paramCount++}`;
                params.push(user_id);
            }
            
            query += ` ORDER BY al.created_at DESC LIMIT $${paramCount++}`;
            params.push(limit);
            
            const result = await pool.query(query, params);
            
            res.status(200).json({
                success: true,
                data: result.rows,
                count: result.rows.length,
                message: 'Audit logs retrieved successfully'
            });
        } catch (error) {
            console.error('Failed to get audit logs:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },
    
    /**
     * Get audit logs for a specific entity
     * GET /api/audit-logs/entity/:entityType/:entityId
     */
    async getEntityAuditLogs(req, res) {
        try {
            const { entityType, entityId } = req.params;
            const { limit = 50 } = req.query;
            
            const result = await pool.query(`
                SELECT 
                    al.*,
                    u.name as user_name,
                    u.email as user_email
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.entity_type = $1 AND al.entity_id = $2
                ORDER BY al.created_at DESC
                LIMIT $3
            `, [entityType, entityId, limit]);
            
            res.status(200).json({
                success: true,
                data: result.rows,
                count: result.rows.length
            });
        } catch (error) {
            console.error('Failed to get entity audit logs:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

module.exports = auditLogController;