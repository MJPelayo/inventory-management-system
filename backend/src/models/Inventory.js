// backend/src/models/Inventory.js
const pool = require('../db/pool');

class Inventory {
    constructor(data) {
        this.id = data.id || null;
        this.product_id = data.product_id;
        this.warehouse_id = data.warehouse_id;
        this.quantity = data.quantity || 0;
        this.reorder_point = data.reorder_point || 0;
        this.max_stock = data.max_stock || 0;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    getQuantity() { return this.quantity; }
    getProductId() { return this.product_id; }
    getWarehouseId() { return this.warehouse_id; }
    
    isLowStock() {
        return this.quantity <= this.reorder_point && this.quantity > 0;
    }
    
    isOutOfStock() {
        return this.quantity === 0;
    }
    
    canFulfill(quantity) {
        return this.quantity >= quantity;
    }

    async save() {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO inventory (product_id, warehouse_id, quantity, reorder_point, max_stock)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (product_id, warehouse_id) 
                DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            const result = await client.query(query, [
                this.product_id, this.warehouse_id, this.quantity, 
                this.reorder_point, this.max_stock
            ]);
            return new Inventory(result.rows[0]);
        } finally {
            client.release();
        }
    }

    static async findByProductAndWarehouse(productId, warehouseId) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM inventory WHERE product_id = $1 AND warehouse_id = $2',
                [productId, warehouseId]
            );
            if (result.rows.length === 0) return null;
            return new Inventory(result.rows[0]);
        } finally {
            client.release();
        }
    }

    static async findByWarehouse(warehouseId) {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT i.*, p.name as product_name, p.sku, p.price
                FROM inventory i
                JOIN products p ON i.product_id = p.id
                WHERE i.warehouse_id = $1
                ORDER BY p.name
            `, [warehouseId]);
            return result.rows.map(row => new Inventory(row));
        } finally {
            client.release();
        }
    }

    static async getLowStock() {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT i.*, p.name as product_name, p.sku, w.name as warehouse_name
                FROM inventory i
                JOIN products p ON i.product_id = p.id
                JOIN warehouses w ON i.warehouse_id = w.id
                WHERE i.quantity <= i.reorder_point AND i.quantity > 0
                ORDER BY (i.quantity::float / NULLIF(i.reorder_point, 0)) ASC
            `);
            return result.rows.map(row => new Inventory(row));
        } finally {
            client.release();
        }
    }

    toJSON() {
        return {
            id: this.id,
            product_id: this.product_id,
            warehouse_id: this.warehouse_id,
            quantity: this.quantity,
            reorder_point: this.reorder_point,
            max_stock: this.max_stock,
            is_low_stock: this.isLowStock(),
            is_out_of_stock: this.isOutOfStock(),
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = { Inventory };