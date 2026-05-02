// backend/src/models/BaseModel.js
const pool = require('../db/pool');

class BaseModel {
    constructor(tableName, data) {
        this.tableName = tableName;
        this.id = data.id || null;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    // Abstract methods - must be implemented by subclasses
    _getInsertFields() {
        throw new Error('_getInsertFields() must be implemented by subclass');
    }

    _getUpdateFields() {
        throw new Error('_getUpdateFields() must be implemented by subclass');
    }

    // CRUD Operations
    async save() {
        const client = await pool.connect();
        try {
            if (this.id) {
                // UPDATE existing record
                const fields = this._getUpdateFields();
                const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
                const values = fields.map(field => this[field]);
                values.push(this.id);
                
                const query = `
                    UPDATE ${this.tableName} 
                    SET ${setClause}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $${values.length}
                    RETURNING *
                `;
                const result = await client.query(query, values);
                return this._hydrate(result.rows[0]);
            } else {
                // INSERT new record
                const fields = this._getInsertFields();
                const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
                const values = fields.map(field => this[field]);
                
                const query = `
                    INSERT INTO ${this.tableName} (${fields.join(', ')})
                    VALUES (${placeholders})
                    RETURNING *
                `;
                const result = await client.query(query, values);
                return this._hydrate(result.rows[0]);
            }
        } finally {
            client.release();
        }
    }

    static async findById(id) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT * FROM ${this.prototype.tableName} WHERE id = $1`, 
                [id]
            );
            if (result.rows.length === 0) return null;
            return this.prototype._hydrate(result.rows[0]);
        } finally {
            client.release();
        }
    }

    static async findAll(filters = {}) {
        const client = await pool.connect();
        try {
            let query = `SELECT * FROM ${this.prototype.tableName} WHERE 1=1`;
            const values = [];
            let paramCount = 1;

            for (const [key, value] of Object.entries(filters)) {
                if (value !== undefined && value !== null) {
                    query += ` AND ${key} = $${paramCount++}`;
                    values.push(value);
                }
            }
            query += ' ORDER BY id';

            const result = await client.query(query, values);
            return result.rows.map(row => this.prototype._hydrate(row));
        } finally {
            client.release();
        }
    }

    static async deleteById(id) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `DELETE FROM ${this.prototype.tableName} WHERE id = $1 RETURNING id`, 
                [id]
            );
            return result.rows.length > 0;
        } finally {
            client.release();
        }
    }

    // Helper method to create instance from raw data
    _hydrate(data) {
        const Constructor = this.constructor;
        return new Constructor(data);
    }

    // toJSON - base implementation
    toJSON() {
        return {
            id: this.id,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = { BaseModel };