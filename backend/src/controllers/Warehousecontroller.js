// backend/src/controllers/Warehousecontroller.js
const pool = require('../db/pool');

// GET /api/warehouses
const getAllWarehouses = async (req, res) => {
    try {
        const { search, is_active } = req.query;

        const conditions = ['1=1'];
        const values = [];
        let i = 1;

        if (search) {
            conditions.push(`(w.name ILIKE $${i} OR w.location ILIKE $${i + 1})`);
            values.push(`%${search}%`, `%${search}%`);
            i += 2;
        }
        if (is_active !== undefined) {
            conditions.push(`w.is_active = $${i++}`);
            values.push(is_active === 'true');
        }

        const result = await pool.query(
            `SELECT
                w.*,
                COUNT(DISTINCT i.product_id) AS product_count,
                COALESCE(SUM(i.quantity), 0) AS total_units
             FROM warehouses w
             LEFT JOIN inventory i ON w.id = i.warehouse_id
             WHERE ${conditions.join(' AND ')}
             GROUP BY w.id
             ORDER BY w.name ASC`,
            values
        );

        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error('getAllWarehouses error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/warehouses/:id
const getWarehouseById = async (req, res) => {
    try {
        const { id } = req.params;

        const warehouse = await pool.query(
            `SELECT
                w.*,
                COUNT(DISTINCT i.product_id) AS product_count,
                COALESCE(SUM(i.quantity), 0) AS total_units
             FROM warehouses w
             LEFT JOIN inventory i ON w.id = i.warehouse_id
             WHERE w.id = $1
             GROUP BY w.id`,
            [id]
        );

        if (warehouse.rows.length === 0)
            return res.status(404).json({ success: false, error: 'Warehouse not found' });

        // Inventory breakdown for this warehouse
        const inventory = await pool.query(
            `SELECT
                i.*,
                p.name AS product_name,
                p.sku,
                p.brand,
                p.price,
                p.cost,
                c.name AS category_name
             FROM inventory i
             JOIN products p ON i.product_id = p.id
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE i.warehouse_id = $1
             ORDER BY p.name ASC`,
            [id]
        );

        res.json({
            success: true,
            data: { ...warehouse.rows[0], inventory: inventory.rows }
        });
    } catch (err) {
        console.error('getWarehouseById error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /api/warehouses
const createWarehouse = async (req, res) => {
    try {
        const { name, location, capacity } = req.body;

        if (!name || name.trim().length < 2)
            return res.status(400).json({ success: false, error: 'Name must be at least 2 characters' });
        if (capacity !== undefined && (isNaN(capacity) || Number(capacity) < 0))
            return res.status(400).json({ success: false, error: 'Capacity must be a non-negative number' });

        // Name uniqueness check
        const existing = await pool.query('SELECT id FROM warehouses WHERE name ILIKE $1', [name.trim()]);
        if (existing.rows.length > 0)
            return res.status(409).json({ success: false, error: `Warehouse "${name}" already exists` });

        const result = await pool.query(
            `INSERT INTO warehouses (name, location, capacity)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [name.trim(), location || null, Number(capacity) || 0]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('createWarehouse error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// PUT /api/warehouses/:id
const updateWarehouse = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, capacity, current_occupancy, is_active } = req.body;

        const existing = await pool.query('SELECT * FROM warehouses WHERE id = $1', [id]);
        if (existing.rows.length === 0)
            return res.status(404).json({ success: false, error: 'Warehouse not found' });

        const current = existing.rows[0];

        if (name !== undefined && name.trim().length < 2)
            return res.status(400).json({ success: false, error: 'Name must be at least 2 characters' });

        const newCapacity = capacity !== undefined ? Number(capacity) : Number(current.capacity);
        const newOccupancy = current_occupancy !== undefined ? Number(current_occupancy) : Number(current.current_occupancy);

        if (newCapacity < 0)
            return res.status(400).json({ success: false, error: 'Capacity cannot be negative' });
        if (newOccupancy < 0)
            return res.status(400).json({ success: false, error: 'Occupancy cannot be negative' });
        if (newOccupancy > newCapacity)
            return res.status(400).json({ success: false, error: 'Occupancy cannot exceed capacity' });

        // Name uniqueness if changed
        if (name && name.trim().toLowerCase() !== current.name.toLowerCase()) {
            const nameCheck = await pool.query(
                'SELECT id FROM warehouses WHERE name ILIKE $1 AND id != $2',
                [name.trim(), id]
            );
            if (nameCheck.rows.length > 0)
                return res.status(409).json({ success: false, error: `Warehouse "${name}" already exists` });
        }

        const result = await pool.query(
            `UPDATE warehouses
             SET name = $1, location = $2, capacity = $3, current_occupancy = $4, is_active = $5,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING *`,
            [
                name !== undefined ? name.trim() : current.name,
                location !== undefined ? location : current.location,
                newCapacity,
                newOccupancy,
                is_active !== undefined ? is_active : current.is_active,
                id
            ]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('updateWarehouse error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// DELETE /api/warehouses/:id
const deleteWarehouse = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await pool.query('SELECT id, name FROM warehouses WHERE id = $1', [id]);
        if (existing.rows.length === 0)
            return res.status(404).json({ success: false, error: 'Warehouse not found' });

        // Block delete if inventory exists
        const invCheck = await pool.query('SELECT id FROM inventory WHERE warehouse_id = $1 LIMIT 1', [id]);
        if (invCheck.rows.length > 0)
            return res.status(409).json({ success: false, error: 'Cannot delete warehouse with existing inventory records' });

        await pool.query('DELETE FROM warehouses WHERE id = $1', [id]);
        res.json({ success: true, message: `Warehouse "${existing.rows[0].name}" deleted` });
    } catch (err) {
        console.error('deleteWarehouse error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// PATCH /api/warehouses/:id/toggle-status
const toggleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE warehouses SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 RETURNING id, name, is_active`,
            [id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ success: false, error: 'Warehouse not found' });

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('toggleStatus error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { getAllWarehouses, getWarehouseById, createWarehouse, updateWarehouse, deleteWarehouse, toggleStatus };