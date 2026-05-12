// backend/src/controllers/auditController.js
const pool = require('../db/pool');

// Helper function to create audit log entry
async function createAuditLog({ user_id, user_name, action, entity_type, entity_id, entity_name, old_values, new_values, ip_address, user_agent, notes }) {
    try {
        await pool.query(
            `INSERT INTO audit_log (user_id, user_name, action, entity_type, entity_id, entity_name, old_values, new_values, ip_address, user_agent, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [user_id, user_name, action, entity_type, entity_id, entity_name, 
             old_values ? JSON.stringify(old_values) : null, 
             new_values ? JSON.stringify(new_values) : null, 
             ip_address, user_agent, notes]
        );
    } catch (err) {
        console.error('Failed to create audit log:', err);
    }
}

// GET /api/audit/logs - Get audit logs with filters
const getAuditLogs = async (req, res) => {
    try {
        const { user_id, entity_type, action, start_date, end_date, limit = 100 } = req.query;
        
        const conditions = ['1=1'];
        const values = [];
        let paramCount = 1;

        if (user_id) {
            conditions.push(`al.user_id = $${paramCount++}`);
            values.push(user_id);
        }
        if (entity_type) {
            conditions.push(`al.entity_type = $${paramCount++}`);
            values.push(entity_type);
        }
        if (action) {
            conditions.push(`al.action = $${paramCount++}`);
            values.push(action);
        }
        if (start_date) {
            conditions.push(`al.created_at >= $${paramCount++}`);
            values.push(start_date);
        }
        if (end_date) {
            conditions.push(`al.created_at <= $${paramCount++}`);
            values.push(end_date);
        }

        const result = await pool.query(
            `SELECT 
                al.*,
                u.name AS performed_by_name,
                u.email AS performed_by_email,
                u.role AS performed_by_role
             FROM audit_log al
             LEFT JOIN users u ON al.user_id = u.id
             WHERE ${conditions.join(' AND ')}
             ORDER BY al.created_at DESC
             LIMIT $${paramCount}`,
            [...values, parseInt(limit)]
        );

        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error('getAuditLogs error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/audit/summary - Get audit summary statistics
const getAuditSummary = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        const conditions = ['1=1'];
        const values = [];
        let paramCount = 1;

        if (start_date) {
            conditions.push(`created_at >= $${paramCount++}`);
            values.push(start_date);
        }
        if (end_date) {
            conditions.push(`created_at <= $${paramCount++}`);
            values.push(end_date);
        }

        const whereClause = conditions.length > 1 ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_actions,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT entity_type) as affected_entity_types,
                COUNT(DISTINCT DATE(created_at)) as active_days
             FROM audit_log
             ${whereClause}`
        );

        // Get breakdown by action type
        const actionBreakdown = await pool.query(
            `SELECT action, COUNT(*) as count 
             FROM audit_log 
             ${whereClause}
             GROUP BY action 
             ORDER BY count DESC`
        );

        // Get breakdown by entity type
        const entityBreakdown = await pool.query(
            `SELECT entity_type, COUNT(*) as count 
             FROM audit_log 
             ${whereClause}
             GROUP BY entity_type 
             ORDER BY count DESC`
        );

        // Get top users
        const topUsers = await pool.query(
            `SELECT u.name, u.role, COUNT(al.id) as action_count
             FROM audit_log al
             JOIN users u ON al.user_id = u.id
             ${whereClause}
             GROUP BY u.id, u.name, u.role
             ORDER BY action_count DESC
             LIMIT 10`
        );

        res.json({ 
            success: true, 
            data: {
                summary: result.rows[0],
                action_breakdown: actionBreakdown.rows,
                entity_breakdown: entityBreakdown.rows,
                top_users: topUsers.rows
            }
        });
    } catch (err) {
        console.error('getAuditSummary error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    createAuditLog,
    getAuditLogs,
    getAuditSummary
};