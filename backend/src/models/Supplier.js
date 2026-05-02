// backend/src/models/Supplier.js
// UPDATED: Inherits from BaseModel - Demonstrates INHERITANCE in OOP

const { BaseModel } = require('./BaseModel');
const pool = require('../db/pool');

class Supplier extends BaseModel {
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
        this.rating = data.rating || 0;
        this.total_orders = data.total_orders || 0;
        this.on_time_deliveries = data.on_time_deliveries || 0;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
    }

    // ============================================
    // BUSINESS LOGIC METHODS (KEEP ALL EXISTING)
    // ============================================
    
    getName() { return this.name; }
    getRating() { return this.rating; }
    
    getOnTimeDeliveryRate() {
        if (this.total_orders === 0) return 0;
        return (this.on_time_deliveries / this.total_orders) * 100;
    }

    updatePerformance(onTime) {
        this.total_orders++;
        if (onTime) {
            this.on_time_deliveries++;
        }
        this.rating = this.getOnTimeDeliveryRate() / 20;  // Scale to 0-5
    }
    
    /**
     * Get performance grade (for UI display)
     */
    getPerformanceGrade() {
        const rate = this.getOnTimeDeliveryRate();
        if (rate >= 95) return { grade: 'Excellent', color: 'success' };
        if (rate >= 85) return { grade: 'Good', color: 'info' };
        if (rate >= 70) return { grade: 'Average', color: 'warning' };
        return { grade: 'Poor', color: 'danger' };
    }

    // ============================================
    // POLYMORPHISM METHODS (Required by BaseModel)
    // ============================================
    
    /**
     * Get fields for INSERT operation
     */
    _getInsertFields() {
        return ['name', 'contact_person', 'phone', 'email', 'address',
                'tax_id', 'payment_terms', 'lead_time_days', 'minimum_order',
                'rating', 'total_orders', 'on_time_deliveries', 'is_active'];
    }
    
    /**
     * Get fields for UPDATE operation
     */
    _getUpdateFields() {
        return ['name', 'contact_person', 'phone', 'email', 'address',
                'tax_id', 'payment_terms', 'lead_time_days', 'minimum_order',
                'rating', 'total_orders', 'on_time_deliveries', 'is_active'];
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
            
            query += ` GROUP BY s.id ORDER BY s.rating DESC`;
            
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
        const performance = this.getPerformanceGrade();
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
            rating: this.rating,
            total_orders: this.total_orders,
            on_time_deliveries: this.on_time_deliveries,
            on_time_delivery_rate: this.getOnTimeDeliveryRate(),
            performance_grade: performance.grade,
            performance_color: performance.color,
            is_active: this.is_active
        };
    }
}

module.exports = { Supplier };