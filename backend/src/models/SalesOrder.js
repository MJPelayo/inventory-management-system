// backend/src/models/SalesOrder.js
const pool = require('../db/pool');

class SalesOrder {
    constructor(data) {
        this.id = data.id || null;
        this.order_number = data.order_number || this.generateOrderNumber();
        this.customer_name = data.customer_name;
        this.customer_email = data.customer_email || null;
        this.customer_phone = data.customer_phone || null;
        this.shipping_address = data.shipping_address || null;
        this.delivery_type = data.delivery_type || 'delivery';
        this.status = data.status || 'pending';
        this.payment_status = data.payment_status || 'pending';
        this.subtotal = data.subtotal || 0;
        this.discount_amount = data.discount_amount || 0;
        this.discount_approved_by = data.discount_approved_by || null;
        this.tax = data.tax || 0;
        this.shipping_cost = data.shipping_cost || 0;
        this.total_amount = data.total_amount || 0;
        this.created_by = data.created_by || null;
        this.items = data.items || [];
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    generateOrderNumber() {
        return 'SO-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }

    calculateTotal() {
        this.subtotal = this.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const discountAmount = this.subtotal * (this.discount_amount / 100);
        this.tax = (this.subtotal - discountAmount) * 0.1; // 10% tax
        this.total_amount = this.subtotal - discountAmount + this.tax + this.shipping_cost;
    }

    async reserveStock() {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            for (const item of this.items) {
                // Check if there's enough stock
                const inventoryCheck = await client.query(`
                    SELECT i.id, i.quantity 
                    FROM inventory i
                    WHERE i.product_id = $1 AND i.warehouse_id = $2
                `, [item.product_id, item.warehouse_id || 1]);
                
                if (inventoryCheck.rows.length === 0) {
                    throw new Error(`No inventory found for product ${item.product_id}`);
                }
                
                const availableQty = inventoryCheck.rows[0].quantity;
                if (availableQty < item.quantity) {
                    throw new Error(`Insufficient stock for product ${item.product_id}. Available: ${availableQty}, Requested: ${item.quantity}`);
                }
                
                // Reserve stock by reducing inventory
                await client.query(`
                    UPDATE inventory 
                    SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
                    WHERE product_id = $2 AND warehouse_id = $3
                `, [item.quantity, item.product_id, item.warehouse_id || 1]);
                
                // Record stock movement
                await client.query(`
                    INSERT INTO stock_movements (product_id, warehouse_id, quantity_change, movement_type, reason, reference_number, performed_by)
                    VALUES ($1, $2, -$3, 'sold', 'Sales order reservation', $4, $5)
                `, [item.product_id, item.warehouse_id || 1, item.quantity, this.order_number, this.created_by]);
            }
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async save() {
        const client = await pool.connect();
        try {
            if (!this.total_amount) {
                this.calculateTotal();
            }
            
            if (this.id) {
                const query = `
                    UPDATE sales_orders 
                    SET status = $1, payment_status = $2, subtotal = $3, 
                        discount_amount = $4, discount_approved_by = $5,
                        tax = $6, shipping_cost = $7, total_amount = $8,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $9
                    RETURNING *
                `;
                const result = await client.query(query, [
                    this.status, this.payment_status, this.subtotal,
                    this.discount_amount, this.discount_approved_by,
                    this.tax, this.shipping_cost, this.total_amount, this.id
                ]);
                
                // Update order items
                await this.saveOrderItems(client);
                
                return new SalesOrder(result.rows[0]);
            } else {
                const query = `
                    INSERT INTO sales_orders (
                        order_number, customer_name, customer_email, customer_phone,
                        shipping_address, delivery_type, status, payment_status,
                        subtotal, discount_amount, discount_approved_by, tax,
                        shipping_cost, total_amount, created_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    RETURNING *
                `;
                const result = await client.query(query, [
                    this.order_number, this.customer_name, this.customer_email,
                    this.customer_phone, this.shipping_address, this.delivery_type,
                    this.status, this.payment_status, this.subtotal,
                    this.discount_amount, this.discount_approved_by, this.tax,
                    this.shipping_cost, this.total_amount, this.created_by
                ]);
                
                this.id = result.rows[0].id;
                await this.saveOrderItems(client);
                
                return new SalesOrder(result.rows[0]);
            }
        } finally {
            client.release();
        }
    }

    async saveOrderItems(client) {
        // Delete existing items
        await client.query('DELETE FROM order_items WHERE order_id = $1 AND order_type = $2', [this.id, 'sales']);
        
        // Insert new items
        for (const item of this.items) {
            await client.query(`
                INSERT INTO order_items (order_id, order_type, product_id, product_name, quantity, unit_price, discount)
                VALUES ($1, 'sales', $2, $3, $4, $5, $6)
            `, [this.id, item.product_id, item.product_name, item.quantity, item.unit_price, item.discount || 0]);
        }
    }

    updateStatus(newStatus) {
        const validStatuses = ['pending', 'processing', 'ready', 'in_transit', 'delivered', 'cancelled'];
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}`);
        }
        this.status = newStatus;
    }

    static async findById(id) {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM sales_orders WHERE id = $1', [id]);
            if (result.rows.length === 0) return null;
            
            const order = new SalesOrder(result.rows[0]);
            
            // Get order items
            const itemsResult = await client.query(`
                SELECT * FROM order_items WHERE order_id = $1 AND order_type = 'sales'
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
            let query = 'SELECT * FROM sales_orders WHERE 1=1';
            const values = [];
            let paramCount = 1;

            if (filters.status) {
                query += ` AND status = $${paramCount++}`;
                values.push(filters.status);
            }
            if (filters.customer_name) {
                query += ` AND customer_name ILIKE $${paramCount++}`;
                values.push(`%${filters.customer_name}%`);
            }
            query += ' ORDER BY created_at DESC';

            const result = await client.query(query, values);
            return result.rows.map(row => new SalesOrder(row));
        } finally {
            client.release();
        }
    }

    toJSON() {
        return {
            id: this.id,
            order_number: this.order_number,
            customer_name: this.customer_name,
            customer_email: this.customer_email,
            customer_phone: this.customer_phone,
            shipping_address: this.shipping_address,
            delivery_type: this.delivery_type,
            status: this.status,
            payment_status: this.payment_status,
            subtotal: this.subtotal,
            discount_amount: this.discount_amount,
            tax: this.tax,
            shipping_cost: this.shipping_cost,
            total_amount: this.total_amount,
            created_by: this.created_by,
            items: this.items,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = { SalesOrder };