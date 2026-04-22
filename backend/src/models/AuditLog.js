/**
 * Audit Log Model
 * Tracks all user actions for security and compliance
 * 
 * @module models/AuditLog
 */

const pool = require('../db/pool');

class AuditLog {
    /**
     * Create new audit log entry
     * @param {Object} data - Audit log data
     */
    constructor(data) {
        this.user_id = data.user_id || null;
        this.action = data.action;
        this.entity_type = data.entity_type || null;
        this.entity_id = data.entity_id || null;
        this.old_data = data.old_data || null;
        this.new_data = data.new_data || null;
        this.ip_address = data.ip_address || null;
        this.user_agent = data.user_agent || null;
        this.created_at = data.created_at || null;
    }

    /**
     * Save audit log to database
     * @returns {Promise<Object>} Saved audit log
     */
    async save() {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO audit_logs (
                    user_id, action, entity_type, entity_id, 
                    old_data, new_data, ip_address, user_agent
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;
            
            const values = [
                this.user_id, this.action, this.entity_type, this.entity_id,
                this.old_data, this.new_data, this.ip_address, this.user_agent
            ];
            
            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Get recent audit logs
     * @param {number} limit - Maximum number of records
     * @returns {Promise<Array>} List of audit logs
     */
    static async getRecent(limit = 100) {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    al.*,
                    u.name as user_name,
                    u.email as user_email,
                    u.role as user_role
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.created_at DESC
                LIMIT $1
            `, [limit]);
            
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Get audit logs for specific entity
     * @param {string} entityType - Type of entity (product, order, etc.)
     * @param {number} entityId - Entity ID
     * @returns {Promise<Array>} List of audit logs
     */
    static async getForEntity(entityType, entityId) {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    al.*,
                    u.name as user_name
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.entity_type = $1 AND al.entity_id = $2
                ORDER BY al.created_at DESC
            `, [entityType, entityId]);
            
            return result.rows;
        } finally {
            client.release();
        }
    }

    toJSON() {
        return {
            id: this.id,
            user_id: this.user_id,
            action: this.action,
            entity_type: this.entity_type,
            entity_id: this.entity_id,
            old_data: this.old_data,
            new_data: this.new_data,
            ip_address: this.ip_address,
            user_agent: this.user_agent,
            created_at: this.created_at
        };
    }
}

module.exports = { AuditLog };