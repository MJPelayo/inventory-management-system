// backend/src/models/Supplier.js
// UPDATED: Inherits from BaseModel - Demonstrates INHERITANCE in OOP

const { BaseModel } = require('./BaseModel');
const pool = require('../db/pool');

class Supplier extends BaseModel {
    static tableName = 'suppliers';

    constructor(data) {
        super('suppliers', data);  // Call parent constructor with table name
        this.name = data.name;
        this.contact_person = data.contact_person || null;
        this.phone = data.phone || null;
        this.email = data.email || null;
        this.address = data.address || null;
        this.tax_id = data.tax_id || null;
        this.payment_terms = data.payment_terms || null;
        this.lead_time_days = data.lead_time_days || 7;
        this.minimum_order = data.minimum_order || 0;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
    }

    // ============================================
    // BUSINESS LOGIC METHODS
    // ============================================
    
    getName() { return this.name; }

    // ============================================
    // POLYMORPHISM METHODS (Required by BaseModel)
    // ============================================
    
    /**
     * Get fields for INSERT operation
     */
    _getInsertFields() {
        return ['name', 'contact_person', 'phone', 'email', 'address',
                'tax_id', 'payment_terms', 'lead_time_days', 'minimum_order',
                'is_active'];
    }
    
    /**
     * Get fields for UPDATE operation
     */
    _getUpdateFields() {
        return ['name', 'contact_person', 'phone', 'email', 'address',
                'tax_id', 'payment_terms', 'lead_time_days', 'minimum_order',
                'is_active'];
    }

    // ============================================
    // STATIC METHODS (Keep existing)
    // ============================================
    
    /**
     * Find suppliers with product count (for dashboard)
     */
    static async findAllWithProductCount(filters = {}) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT s.*, COUNT(p.id) as product_count
                FROM suppliers s
                LEFT JOIN products p ON p.supplier_id = s.id
                WHERE 1=1
            `;
            const values = [];
            let paramCount = 1;

            if (filters.is_active !== undefined) {
                query += ` AND s.is_active = $${paramCount++}`;
                values.push(filters.is_active);
            }
            if (filters.search) {
                query += ` AND (s.name ILIKE $${paramCount++} OR s.contact_person ILIKE $${paramCount++})`;
                values.push(`%${filters.search}%`, `%${filters.search}%`);
            }
            
            query += ` GROUP BY s.id ORDER BY s.name`;
            
            if (filters.limit) {
                query += ` LIMIT $${paramCount++}`;
                values.push(filters.limit);
            }

            const result = await client.query(query, values);
            return result.rows;
        } finally {
            client.release();
        }
    }
    
    /**
     * Get products supplied by this supplier
     */
    async getProducts(limit = 20) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT id, name, sku, price, cost, is_active
                 FROM products
                 WHERE supplier_id = $1
                 LIMIT $2`,
                [this.id, limit]
            );
            return result.rows;
        } finally {
            client.release();
        }
    }
    
    /**
     * Get purchase order history for this supplier
     */
    async getPurchaseOrderHistory(limit = 10) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT id, po_number, status, total_amount, created_at, expected_delivery
                 FROM supply_orders
                 WHERE supplier_id = $1
                 ORDER BY created_at DESC
                 LIMIT $2`,
                [this.id, limit]
            );
            return result.rows;
        } finally {
            client.release();
        }
    }

    // ============================================
    // OVERRIDE toJSON (Include base fields + supplier-specific)
    // ============================================
    
    toJSON() {
        return {
            ...super.toJSON(),  // Includes id, created_at, updated_at
            name: this.name,
            contact_person: this.contact_person,
            phone: this.phone,
            email: this.email,
            address: this.address,
            tax_id: this.tax_id,
            payment_terms: this.payment_terms,
            lead_time_days: this.lead_time_days,
            minimum_order: this.minimum_order,
            is_active: this.is_active
        };
    }
}

module.exports = { Supplier };