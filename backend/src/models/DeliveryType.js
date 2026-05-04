const pool = require('../db/pool');

class DeliveryType {
    constructor(data) {
        this.id = data.id;
        this.type_code = data.type_code;
        this.type_name = data.type_name;
        this.requires_address = data.requires_address;
        this.icon = data.icon;
        this.sort_order = data.sort_order;
        this.is_active = data.is_active;
    }

    static async findAll(activeOnly = true) {
        const client = await pool.connect();
        try {
            let query = 'SELECT * FROM delivery_types';
            if (activeOnly) query += ' WHERE is_active = true';
            query += ' ORDER BY sort_order';
            const result = await client.query(query);
            return result.rows.map(row => new DeliveryType(row));
        } finally {
            client.release();
        }
    }

    toJSON() {
        return {
            id: this.id,
            type_code: this.type_code,
            type_name: this.type_name,
            requires_address: this.requires_address,
            icon: this.icon
        };
    }
}

module.exports = { DeliveryType };