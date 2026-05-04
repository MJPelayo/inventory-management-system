const pool = require('../db/pool');

class PaymentTerm {
    constructor(data) {
        this.id = data.id;
        this.term_code = data.term_code;
        this.term_name = data.term_name;
        this.days = data.days;
        this.description = data.description;
        this.sort_order = data.sort_order;
        this.is_active = data.is_active;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async findAll(activeOnly = true) {
        const client = await pool.connect();
        try {
            let query = 'SELECT * FROM payment_terms';
            if (activeOnly) {
                query += ' WHERE is_active = true';
            }
            query += ' ORDER BY sort_order, term_name';
            
            const result = await client.query(query);
            return result.rows.map(row => new PaymentTerm(row));
        } finally {
            client.release();
        }
    }

    static async findById(id) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM payment_terms WHERE id = $1',
                [id]
            );
            return result.rows.length > 0 ? new PaymentTerm(result.rows[0]) : null;
        } finally {
            client.release();
        }
    }

    toJSON() {
        return {
            id: this.id,
            term_code: this.term_code,
            term_name: this.term_name,
            days: this.days,
            description: this.description,
            is_active: this.is_active
        };
    }
}

module.exports = { PaymentTerm };