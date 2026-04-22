// backend/src/models/Supplier.js
const pool = require('../db/pool');

class Supplier {
    constructor(data) {
        this.id = data.id || null;
        this.name = data.name;
        this.contact_person = data.contact_person || null;
        this.phone = data.phone || null;
        this.email = data.email || null;
        this.address = data.address || null;
        this.tax_id = data.tax_id || null;
        this.payment_terms = data.payment_terms || null;
        this.lead_time_days = data.lead_time_days !== undefined ? data.lead_time_days : 7;
        this.minimum_order = data.minimum_order !== undefined ? data.minimum_order : 0;
        this.rating = data.rating !== undefined ? data.rating : 0;
        this.total_orders = data.total_orders !== undefined ? data.total_orders : 0;
        this.on_time_deliveries = data.on_time_deliveries !== undefined ? data.on_time_deliveries : 0;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    // Getters
    getId() { return this.id; }
    getName() { return this.name; }
    getEmail() { return this.email; }
    isActive() { return this.is_active; }

    // Setters with validation
    setName(name) {
        if (!name || name.length < 2) {
            throw new Error('Name must be at least 2 characters');
        }
        this.name = name;
    }

    setEmail(email) {
        if (!email) {
            this.email = null;
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }
        this.email = email;
    }

    setLeadTimeDays(days) {
        if (days < 0) {
            throw new Error('Lead time must be a non-negative number');
        }
        this.lead_time_days = days;
    }

    setMinimumOrder(amount) {
        if (amount < 0) {
            throw new Error('Minimum order must be a non-negative number');
        }
        this.minimum_order = amount;
    }

    setRating(rating) {
        if (rating < 0 || rating > 5) {
            throw new Error('Rating must be between 0 and 5');
        }
        this.rating = rating;
    }

    deactivate() {
        this.is_active = false;
    }

    activate() {
        this.is_active = true;
    }

    // CRUD Operations
    async save() {
        const client = await pool.connect();
        try {
            if (this.id) {
                // UPDATE existing supplier
                const query = `
                    UPDATE suppliers
                    SET name = $1, contact_person = $2, phone = $3, email = $4,
                        address = $5, tax_id = $6, payment_terms = $7, lead_time_days = $8,
                        minimum_order = $9, rating = $10, total_orders = $11,
                        on_time_deliveries = $12, is_active = $13,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $14
                    RETURNING *
                `;
                const values = [
                    this.name, this.contact_person, this.phone, this.email,
                    this.address, this.tax_id, this.payment_terms, this.lead_time_days,
                    this.minimum_order, this.rating, this.total_orders,
                    this.on_time_deliveries, this.is_active, this.id
                ];
                const result = await client.query(query, values);
                return new Supplier(result.rows[0]);
            }

            // INSERT new supplier
            const query = `
                INSERT INTO suppliers (
                    name, contact_person, phone, email, address, tax_id,
                    payment_terms, lead_time_days, minimum_order, rating,
                    total_orders, on_time_deliveries, is_active
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `;
            const values = [
                this.name, this.contact_person, this.phone, this.email,
                this.address, this.tax_id, this.payment_terms, this.lead_time_days,
                this.minimum_order, this.rating, this.total_orders,
                this.on_time_deliveries, this.is_active
            ];
            const result = await client.query(query, values);
            return new Supplier(result.rows[0]);
        } finally {
            client.release();
        }
    }

    static async findById(id) {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM suppliers WHERE id = $1', [id]);
            if (result.rows.length === 0) return null;
            return new Supplier(result.rows[0]);
        } finally {
            client.release();
        }
    }

    static async findByTaxId(taxId) {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM suppliers WHERE tax_id = $1', [taxId]);
            if (result.rows.length === 0) return null;
            return new Supplier(result.rows[0]);
        } finally {
            client.release();
        }
    }

    static async findAll(filters = {}) {
        const client = await pool.connect();
        try {
            let query = 'SELECT * FROM suppliers WHERE 1=1';
            const values = [];
            let paramCount = 1;

            if (filters.search) {
                query += ` AND (name ILIKE $${paramCount} OR contact_person ILIKE $${paramCount + 1} OR email ILIKE $${paramCount + 2})`;
                values.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
                paramCount += 3;
            }
            if (filters.is_active !== undefined) {
                query += ` AND is_active = $${paramCount++}`;
                values.push(filters.is_active);
            }

            query += ' ORDER BY name';

            const result = await client.query(query, values);
            return result.rows.map(row => new Supplier(row));
        } finally {
            client.release();
        }
    }

    static async deleteById(id) {
        const client = await pool.connect();
        try {
            const result = await client.query('DELETE FROM suppliers WHERE id = $1 RETURNING id', [id]);
            return result.rows.length > 0;
        } finally {
            client.release();
        }
    }

    toJSON() {
        return {
            id: this.id,
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
            is_active: this.is_active,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = { Supplier };