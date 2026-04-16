// backend/src/models/Warehouse.js
const pool = require('../db/pool');

class Warehouse {
    constructor(data) {
        this.id = data.id || null;
        this.name = data.name;
        this.location = data.location || null;
        this.capacity = data.capacity || 0;
        this.current_occupancy = data.current_occupancy || 0;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    getId() { return this.id; }
    getName() { return this.name; }
    getCapacity() { return this.capacity; }
    
    getUtilization() {
        if (this.capacity === 0) return 0;
        return (this.current_occupancy / this.capacity) * 100;
    }

    hasCapacity(additionalUnits) {
        return this.current_occupancy + additionalUnits <= this.capacity;
    }

    async updateOccupancy() {
        const client = await pool.connect();
        try {
            const result = await client.query(
                'SELECT SUM(quantity) as total FROM inventory WHERE warehouse_id = $1',
                [this.id]
            );
            this.current_occupancy = parseInt(result.rows[0].total) || 0;
            
            await client.query(
                'UPDATE warehouses SET current_occupancy = $1 WHERE id = $2',
                [this.current_occupancy, this.id]
            );
        } finally {
            client.release();
        }
    }

    async save() {
        const client = await pool.connect();
        try {
            if (this.id) {
                const query = `
                    UPDATE warehouses 
                    SET name = $1, location = $2, capacity = $3, 
                        current_occupancy = $4, is_active = $5,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $6
                    RETURNING *
                `;
                const values = [this.name, this.location, this.capacity, 
                    this.current_occupancy, this.is_active, this.id];
                const result = await client.query(query, values);
                return new Warehouse(result.rows[0]);
            } else {
                const query = `
                    INSERT INTO warehouses (name, location, capacity)
                    VALUES ($1, $2, $3)
                    RETURNING *
                `;
                const values = [this.name, this.location, this.capacity];
                const result = await client.query(query, values);
                return new Warehouse(result.rows[0]);
            }
        } finally {
            client.release();
        }
    }

    static async findById(id) {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM warehouses WHERE id = $1', [id]);
            if (result.rows.length === 0) return null;
            return new Warehouse(result.rows[0]);
        } finally {
            client.release();
        }
    }

    static async findAll() {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM warehouses ORDER BY name');
            return result.rows.map(row => new Warehouse(row));
        } finally {
            client.release();
        }
    }

    async checkInventory() {
        const client = await pool.connect();
        try {
            const result = await client.query(
                'SELECT COUNT(*) as count FROM inventory WHERE warehouse_id = $1',
                [this.id]
            );
            return parseInt(result.rows[0].count) > 0;
        } finally {
            client.release();
        }
    }

    async delete() {
        const client = await pool.connect();
        try {
            const result = await client.query('DELETE FROM warehouses WHERE id = $1 RETURNING id', [this.id]);
            return result.rows.length > 0;
        } finally {
            client.release();
        }
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            location: this.location,
            capacity: this.capacity,
            current_occupancy: this.current_occupancy,
            utilization: this.getUtilization(),
            is_active: this.is_active,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = { Warehouse };