const pool = require('../db/pool');

class ShippingMethod {
    constructor(data) {
        this.id = data.id;
        this.method_code = data.method_code;
        this.method_name = data.method_name;
        this.base_cost = parseFloat(data.base_cost);
        this.estimated_days = data.estimated_days;
        this.sort_order = data.sort_order;
        this.is_active = data.is_active;
    }

    static async findAll(activeOnly = true) {
        const client = await pool.connect();
        try {
            let query = 'SELECT * FROM shipping_methods';
            if (activeOnly) query += ' WHERE is_active = true';
            query += ' ORDER BY sort_order';
            const result = await client.query(query);
            return result.rows.map(row => new ShippingMethod(row));
        } finally {
            client.release();
        }
    }

    toJSON() {
        return {
            id: this.id,
            method_code: this.method_code,
            method_name: this.method_name,
            base_cost: this.base_cost,
            estimated_days: this.estimated_days
        };
    }
}

module.exports = { ShippingMethod };