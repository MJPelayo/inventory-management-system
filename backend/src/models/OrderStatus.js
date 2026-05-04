const pool = require('../db/pool');

class OrderStatus {
    constructor(data) {
        this.id = data.id;
        this.status_code = data.status_code;
        this.status_name = data.status_name;
        this.color = data.color;
        this.sort_order = data.sort_order;
        this.is_active = data.is_active;
    }

    static async findAll(activeOnly = true) {
        const client = await pool.connect();
        try {
            let query = 'SELECT * FROM order_statuses';
            if (activeOnly) query += ' WHERE is_active = true';
            query += ' ORDER BY sort_order';
            const result = await client.query(query);
            return result.rows.map(row => new OrderStatus(row));
        } finally {
            client.release();
        }
    }

    static async getByCode(code) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM order_statuses WHERE status_code = $1',
                [code]
            );
            return result.rows.length > 0 ? new OrderStatus(result.rows[0]) : null;
        } finally {
            client.release();
        }
    }

    toJSON() {
        return {
            id: this.id,
            status_code: this.status_code,
            status_name: this.status_name,
            color: this.color
        };
    }
}

module.exports = { OrderStatus };