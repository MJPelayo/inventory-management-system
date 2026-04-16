// backend/src/models/SupplyOrder.js
const pool = require('../db/pool');

class SupplyOrder {
    constructor(data) {
        this.id = data.id || null;
        this.po_number = data.po_number || this.generatePONumber();
        this.supplier_id = data.supplier_id;
        this.status = data.status || 'pending';
        this.order_date = data.order_date || new Date();
        this.expected_delivery = data.expected_delivery || null;
        this.actual_delivery = data.actual_delivery || null;
        this.subtotal = data.subtotal || 0;
        this.shipping_cost = data.shipping_cost || 0;
        this.total_amount = data.total_amount || 0;
        this.created_by = data.created_by || null;
        this.items = data.items || [];
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    generatePONumber() {
        return 'PO-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }

    calculateTotal() {
        this.subtotal = this.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        this.total_amount = this.subtotal + (this.shipping_cost || 0);
    }

    async save() {
        const client = await pool.connect();
        try {
            if (!this.total_amount) {
                this.calculateTotal();
            }
            
            if (this.id) {
                const query = `
                    UPDATE supply_orders 
                    SET status = $1, expected_delivery = $2, subtotal = $3,
                        shipping_cost = $4, total_amount = $5,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $6
                    RETURNING *
                `;
                const result = await client.query(query, [
                    this.status, this.expected_delivery, this.subtotal,
                    this.shipping_cost, this.total_amount, this.id
                ]);
                
                // Update order items
                await this.saveOrderItems(client);
                
                return new SupplyOrder(result.rows[0]);
            } else {
                const query = `
                    INSERT INTO supply_orders (
                        po_number, supplier_id, status, expected_delivery,
                        subtotal, shipping_cost, total_amount, created_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *
                `;
                const result = await client.query(query, [
                    this.po_number, this.supplier_id, this.status,
                    this.expected_delivery, this.subtotal,
                    this.shipping_cost, this.total_amount, this.created_by
                ]);
                
                this.id = result.rows[0].id;
                await this.saveOrderItems(client);
                
                return new SupplyOrder(result.rows[0]);
            }
        } finally {
            client.release();
        }
    }

    async saveOrderItems(client) {
        // Delete existing items
        await client.query('DELETE FROM order_items WHERE order_id = $1 AND order_type = $2', [this.id, 'supply']);
        
        // Insert new items
        for (const item of this.items) {
            await client.query(`
                INSERT INTO order_items (order_id, order_type, product_id, product_name, quantity, unit_price, discount)
                VALUES ($1, 'supply', $2, $3, $4, $5, $6)
            `, [this.id, item.product_id, item.product_name, item.quantity, item.unit_price, item.discount || 0]);
        }
    }

    async receiveStock(warehouseId, performedBy) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Get order items
            const itemsResult = await client.query(`
                SELECT * FROM order_items WHERE order_id = $1 AND order_type = 'supply'
            `, [this.id]);
            
            for (const item of itemsResult.rows) {
                // Add stock to inventory
                await client.query(`
                    INSERT INTO inventory (product_id, warehouse_id, quantity, reorder_point, max_stock)
                    VALUES ($1, $2, $3, 10, 200)
                    ON CONFLICT (product_id, warehouse_id) 
                    DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP
                `, [item.product_id, warehouseId, item.quantity]);
                
                // Record stock movement
                await client.query(`
                    INSERT INTO stock_movements (product_id, warehouse_id, quantity_change, movement_type, reason, reference_number, performed_by)
                    VALUES ($1, $2, $3, 'received', 'Purchase order received', $4, $5)
                `, [item.product_id, warehouseId, item.quantity, this.po_number, performedBy]);
            }
            
            // Update order status
            await client.query(`
                UPDATE supply_orders 
                SET status = 'delivered', actual_delivery = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [this.id]);
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async findById(id) {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM supply_orders WHERE id = $1', [id]);
            if (result.rows.length === 0) return null;
            
            const order = new SupplyOrder(result.rows[0]);
            
            // Get order items
            const itemsResult = await client.query(`
                SELECT * FROM order_items WHERE order_id = $1 AND order_type = 'supply'
            `, [id]);
            order.items = itemsResult.rows;
            
            return order;
        } finally {
            client.release();
        }
    }

    static async findAll(filters = {}) {
        const client = await pool.connect();
        try {
            let query = 'SELECT * FROM supply_orders WHERE 1=1';
            const values = [];
            let paramCount = 1;

            if (filters.supplier_id) {
                query += ` AND supplier_id = $${paramCount++}`;
                values.push(filters.supplier_id);
            }
            if (filters.status) {
                query += ` AND status = $${paramCount++}`;
                values.push(filters.status);
            }
            query += ' ORDER BY created_at DESC';

            const result = await client.query(query, values);
            return result.rows.map(row => new SupplyOrder(row));
        } finally {
            client.release();
        }
    }

    toJSON() {
        return {
            id: this.id,
            po_number: this.po_number,
            supplier_id: this.supplier_id,
            status: this.status,
            order_date: this.order_date,
            expected_delivery: this.expected_delivery,
            actual_delivery: this.actual_delivery,
            subtotal: this.subtotal,
            shipping_cost: this.shipping_cost,
            total_amount: this.total_amount,
            created_by: this.created_by,
            items: this.items,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = { SupplyOrder };