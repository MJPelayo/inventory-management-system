// backend/src/models/Product.js
// UPDATED: Inherits from BaseModel - Demonstrates INHERITANCE in OOP

const { BaseModel } = require('./BaseModel');
const pool = require('../db/pool');

class Product extends BaseModel {
    static tableName = 'products';
    constructor(data) {
        super('products', data);  // Call parent constructor with table name
        this.name = data.name;
        this.description = data.description || null;
        this.sku = data.sku;
        this.price = data.price;
        this.cost = data.cost;
        this.category_id = data.category_id || null;
        this.supplier_id = data.supplier_id || null;
        this.brand = data.brand || null;
        this.image_url = data.image_url || null;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
    }

    // ============================================
    // BUSINESS LOGIC METHODS (KEEP ALL EXISTING)
    // ============================================
    
    getName() { return this.name; }
    getSku() { return this.sku; }
    getPrice() { return this.price; }
    getCost() { return this.cost; }
    getProfitMargin() { 
        if (this.price === 0) return 0;
        return ((this.price - this.cost) / this.price) * 100;
    }
    isActive() { return this.is_active; }

    // Setters with validation
    setName(name) {
        if (!name || name.length < 2) {
            throw new Error('Product name must be at least 2 characters');
        }
        this.name = name;
    }

    setSku(sku) {
        if (!sku || sku.length < 2) {
            throw new Error('SKU must be at least 2 characters');
        }
        this.sku = sku;
    }

    setPrice(price) {
        if (price < 0) {
            throw new Error('Price cannot be negative');
        }
        if (price < this.cost) {
            throw new Error('Price cannot be less than cost');
        }
        this.price = price;
    }

    setCost(cost) {
        if (cost < 0) {
            throw new Error('Cost cannot be negative');
        }
        if (this.price > 0 && cost > this.price) {
            throw new Error('Cost cannot be greater than price');
        }
        this.cost = cost;
    }

    // Business Logic
    applyDiscount(percentage) {
        if (percentage < 0 || percentage > 100) {
            throw new Error('Discount must be between 0 and 100');
        }
        return this.price * (1 - percentage / 100);
    }

    // ============================================
    // POLYMORPHISM METHODS (Required by BaseModel)
    // ============================================
    
    /**
     * Get fields for INSERT operation
     * Each child class provides its own fields - This is POLYMORPHISM
     */
    _getInsertFields() {
        return ['name', 'description', 'sku', 'price', 'cost',
                'category_id', 'supplier_id', 'brand', 'image_url', 'is_active'];
    }
    
    /**
     * Get fields for UPDATE operation
     */
    _getUpdateFields() {
        return ['name', 'description', 'sku', 'price', 'cost',
                'category_id', 'supplier_id', 'brand', 'image_url', 'is_active'];
    }

    // ============================================
    // STATIC METHODS (Keep existing, add BaseModel compatibility)
    // ============================================

    static async findBySku(sku) {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM products WHERE sku = $1', [sku]);
            if (result.rows.length === 0) return null;
            return new Product(result.rows[0]);
        } finally {
            client.release();
        }
    }

    /**
     * Override findAll to support product-specific filters
     */
    static async findAll(filters = {}) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT p.*, c.name as category_name, s.name as supplier_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                WHERE 1=1
            `;
            const values = [];
            let paramCount = 1;

            if (filters.category_id) {
                query += ` AND p.category_id = $${paramCount++}`;
                values.push(filters.category_id);
            }
            if (filters.supplier_id) {
                query += ` AND p.supplier_id = $${paramCount++}`;
                values.push(filters.supplier_id);
            }
            if (filters.is_active !== undefined) {
                query += ` AND p.is_active = $${paramCount++}`;
                values.push(filters.is_active);
            }
            if (filters.search) {
                query += ` AND (p.name ILIKE $${paramCount++} OR p.sku ILIKE $${paramCount++})`;
                values.push(`%${filters.search}%`, `%${filters.search}%`);
            }
            
            query += ' ORDER BY p.name';
            
            if (filters.limit) {
                query += ` LIMIT $${paramCount++}`;
                values.push(filters.limit);
            }
            if (filters.offset) {
                query += ` OFFSET $${paramCount++}`;
                values.push(filters.offset);
            }

            const result = await client.query(query, values);
            return result.rows.map(row => {
                const product = new Product(row);
                product.category_name = row.category_name;
                product.supplier_name = row.supplier_name;
                return product;
            });
        } finally {
            client.release();
        }
    }

    async getInventory() {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT i.*, w.name as warehouse_name, w.location 
                 FROM inventory i
                 JOIN warehouses w ON i.warehouse_id = w.id
                 WHERE i.product_id = $1`,
                [this.id]
            );
            return result.rows;
        } finally {
            client.release();
        }
    }

    // ============================================
    // OVERRIDE toJSON (Include base fields + product-specific)
    // ============================================
    
    toJSON() {
        return {
            ...super.toJSON(),  // Includes id, created_at, updated_at
            name: this.name,
            description: this.description,
            sku: this.sku,
            price: this.price,
            cost: this.cost,
            profit_margin: this.getProfitMargin(),
            category_id: this.category_id,
            supplier_id: this.supplier_id,
            brand: this.brand,
            image_url: this.image_url,
            is_active: this.is_active
        };
    }
}

module.exports = { Product };