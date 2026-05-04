const pool = require('../db/pool');

class UserRole {
    constructor(data) {
        this.id = data.id;
        this.role_code = data.role_code;
        this.role_name = data.role_name;
        this.description = data.description;
        this.sort_order = data.sort_order;
        this.is_active = data.is_active;
    }

    static async findAll(activeOnly = true) {
        const client = await pool.connect();
        try {
            let query = 'SELECT * FROM user_roles';
            if (activeOnly) query += ' WHERE is_active = true';
            query += ' ORDER BY sort_order';
            const result = await client.query(query);
            return result.rows.map(row => new UserRole(row));
        } finally {
            client.release();
        }
    }

    static async getByCode(code) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM user_roles WHERE role_code = $1',
                [code]
            );
            return result.rows.length > 0 ? new UserRole(result.rows[0]) : null;
        } finally {
            client.release();
        }
    }

    toJSON() {
        return {
            id: this.id,
            role_code: this.role_code,
            role_name: this.role_name,
            description: this.description
        };
    }
}

module.exports = { UserRole };