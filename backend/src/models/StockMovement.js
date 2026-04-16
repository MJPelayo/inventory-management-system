// backend/src/models/StockMovement.js
const pool = require('../db/pool');

class StockMovement {
    constructor(data) {
        this.id = data.id || null;
        this.product_id = data.product_id;
        this.warehouse_id = data.warehouse_id;
        this.quantity_change = data.quantity_change;
        this.movement_type = data.movement_type;
        this.reason = data.reason || null;
        this.reference_number = data.reference_number || null;
        this.performed_by = data.performed_by;
        this.created_at = data.created_at || null;
    }

    async record() {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO stock_movements (
                    product_id, warehouse_id, quantity_change, movement_type,
                    reason, reference_number, performed_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;
            const result = await client.query(query, [
                this.product_id, this.warehouse_id, this.quantity_change, this.movement_type,
                this.reason, this.reference_number, this.performed_by
            ]);
            this.id = result.rows[0].id;
            this.created_at = result.rows[0].created_at;
            return this;
        } finally {
            client.release();
        }
    }

    static async getProductHistory(productId, limit = 100) {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT sm.*, u.name as performed_by_name, w.name as warehouse_name
                FROM stock_movements sm
                JOIN users u ON sm.performed_by = u.id
                JOIN warehouses w ON sm.warehouse_id = w.id
                WHERE sm.product_id = $1
                ORDER BY sm.created_at DESC
                LIMIT $2
            `, [productId, limit]);
            return result.rows;
        } finally {
            client.release();
        }
    }

    toJSON() {
        return {
            id: this.id,
            product_id: this.product_id,
            warehouse_id: this.warehouse_id,
            quantity_change: this.quantity_change,
            movement_type: this.movement_type,
            reason: this.reason,
            reference_number: this.reference_number,
            performed_by: this.performed_by,
            created_at: this.created_at
        };
    }
}

module.exports = { StockMovement };