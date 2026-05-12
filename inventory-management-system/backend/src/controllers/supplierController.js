// backend/src/controllers/supplierController.js
const pool = require('../db/pool');
const { createAuditLog } = require('./auditController');

// GET /api/suppliers - Get all suppliers
const getAllSuppliers = async (req, res) => {
    try {
        const { search, is_active, rating_min } = req.query;
        
        const conditions = ['1=1'];
        const values = [];
        let i = 1;

        if (search) {
            conditions.push(`(s.name ILIKE $${i} OR s.contact_person ILIKE $${i + 1} OR s.email ILIKE $${i + 2})`);
            values.push(`%${search}%`, `%${search}%`, `%${search}%`);
            i += 3;
        }
        if (is_active !== undefined) {
            conditions.push(`s.is_active = $${i++}`);
            values.push(is_active === 'true');
        }
        if (rating_min) {
            conditions.push(`s.rating >= $${i++}`);
            values.push(parseFloat(rating_min));
        }

        const result = await pool.query(
            `SELECT 
                s.*,
                COUNT(DISTINCT so.id) as total_orders,
                COALESCE(SUM(so.total_amount), 0) as total_spent
             FROM suppliers s
             LEFT JOIN supply_orders so ON s.id = so.supplier_id
             WHERE ${conditions.join(' AND ')}
             GROUP BY s.id
             ORDER BY s.name ASC`,
            values
        );

        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error('getAllSuppliers error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/suppliers/:id - Get single supplier
const getSupplierById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT * FROM suppliers WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Supplier not found' });
        }

        // Get order history
        const orders = await pool.query(
            `SELECT 
                so.*,
                oi.product_name,
                oi.quantity,
                oi.unit_price
             FROM supply_orders so
             LEFT JOIN order_items oi ON so.id = oi.order_id AND oi.order_type = 'supply'
             WHERE so.supplier_id = $1
             ORDER BY so.order_date DESC
             LIMIT 20`,
            [id]
        );

        res.json({ 
            success: true, 
            data: { 
                ...result.rows[0], 
                orders: orders.rows 
            } 
        });
    } catch (err) {
        console.error('getSupplierById error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /api/suppliers - Create new supplier
const createSupplier = async (req, res) => {
    try {
        const { 
            name, contact_person, phone, email, address, 
            tax_id, payment_terms, lead_time_days, minimum_order 
        } = req.body;
        const user = req.user;

        if (!name || name.trim().length < 2) {
            return res.status(400).json({ success: false, error: 'Name must be at least 2 characters' });
        }

        // Check for duplicate name
        const existing = await pool.query('SELECT id FROM suppliers WHERE name ILIKE $1', [name.trim()]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, error: `Supplier "${name}" already exists` });
        }

        const result = await pool.query(
            `INSERT INTO suppliers (name, contact_person, phone, email, address, tax_id, payment_terms, lead_time_days, minimum_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [name.trim(), contact_person, phone, email, address, tax_id, payment_terms, lead_time_days, minimum_order]
        );

        await createAuditLog({
            user_id: user.id,
            user_name: user.name,
            action: 'create',
            entity_type: 'supplier',
            entity_id: result.rows[0].id,
            entity_name: result.rows[0].name,
            new_values: { name: result.rows[0].name, contact_person, email },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
            notes: 'Supplier created'
        });

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('createSupplier error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// PUT /api/suppliers/:id - Update supplier
const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, contact_person, phone, email, address, 
            tax_id, payment_terms, lead_time_days, minimum_order, 
            rating, total_orders, on_time_deliveries, is_active 
        } = req.body;
        const user = req.user;

        const existing = await pool.query('SELECT * FROM suppliers WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Supplier not found' });
        }

        const current = existing.rows[0];

        if (name && name.trim().length < 2) {
            return res.status(400).json({ success: false, error: 'Name must be at least 2 characters' });
        }

        const result = await pool.query(
            `UPDATE suppliers SET
                name = COALESCE($1, name),
                contact_person = COALESCE($2, contact_person),
                phone = COALESCE($3, phone),
                email = COALESCE($4, email),
                address = COALESCE($5, address),
                tax_id = COALESCE($6, tax_id),
                payment_terms = COALESCE($7, payment_terms),
                lead_time_days = COALESCE($8, lead_time_days),
                minimum_order = COALESCE($9, minimum_order),
                rating = COALESCE($10, rating),
                total_orders = COALESCE($11, total_orders),
                on_time_deliveries = COALESCE($12, on_time_deliveries),
                is_active = COALESCE($13, is_active),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $14
             RETURNING *`,
            [name, contact_person, phone, email, address, tax_id, payment_terms, lead_time_days, minimum_order, rating, total_orders, on_time_deliveries, is_active, id]
        );

        await createAuditLog({
            user_id: user.id,
            user_name: user.name,
            action: 'update',
            entity_type: 'supplier',
            entity_id: parseInt(id),
            entity_name: result.rows[0].name,
            old_values: { name: current.name, email: current.email },
            new_values: { name: result.rows[0].name, email: result.rows[0].email },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
            notes: 'Supplier updated'
        });

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('updateSupplier error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// DELETE /api/suppliers/:id - Delete supplier
const deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const existing = await pool.query('SELECT * FROM suppliers WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Supplier not found' });
        }

        // Check for pending orders
        const pendingOrders = await pool.query(
            "SELECT id FROM supply_orders WHERE supplier_id = $1 AND status IN ('pending', 'processing')",
            [id]
        );
        if (pendingOrders.rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                error: 'Cannot delete supplier with pending or processing orders' 
            });
        }

        await pool.query('DELETE FROM suppliers WHERE id = $1', [id]);

        await createAuditLog({
            user_id: user.id,
            user_name: user.name,
            action: 'delete',
            entity_type: 'supplier',
            entity_id: parseInt(id),
            entity_name: existing.rows[0].name,
            old_values: { name: existing.rows[0].name },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
            notes: 'Supplier deleted'
        });

        res.json({ success: true, message: 'Supplier deleted successfully' });
    } catch (err) {
        console.error('deleteSupplier error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// PATCH /api/suppliers/:id/toggle-status - Toggle supplier active status
const toggleSupplierStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE suppliers SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Supplier not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('toggleSupplierStatus error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    toggleSupplierStatus
};