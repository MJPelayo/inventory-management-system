// backend/src/controllers/Productcontrollers.js
const pool = require('../db/pool');

// GET /api/products
const getAllProducts = async (req, res) => {
    try {
        const { search, category_id, supplier_id, is_active, sort = 'name', order = 'asc' } = req.query;

        const validSorts = { name: 'p.name', price: 'p.price', cost: 'p.cost', created_at: 'p.created_at' };
        const sortCol = validSorts[sort] || 'p.name';
        const sortDir = order === 'desc' ? 'DESC' : 'ASC';

        const conditions = ['1=1'];
        const values = [];
        let i = 1;

        if (search) {
            conditions.push(`(p.name ILIKE $${i} OR p.sku ILIKE $${i + 1} OR p.brand ILIKE $${i + 2})`);
            values.push(`%${search}%`, `%${search}%`, `%${search}%`);
            i += 3;
        }
        if (category_id) {
            conditions.push(`p.category_id = $${i++}`);
            values.push(category_id);
        }
        if (supplier_id) {
            conditions.push(`p.supplier_id = $${i++}`);
            values.push(supplier_id);
        }
        if (is_active !== undefined) {
            conditions.push(`p.is_active = $${i++}`);
            values.push(is_active === 'true');
        }

        const query = `
            SELECT 
                p.*,
                c.name AS category_name,
                s.name AS supplier_name,
                COALESCE(SUM(inv.quantity), 0) AS total_stock
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN inventory inv ON p.id = inv.product_id
            WHERE ${conditions.join(' AND ')}
            GROUP BY p.id, c.name, s.name
            ORDER BY ${sortCol} ${sortDir}
        `;

        const result = await pool.query(query, values);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (err) {
        console.error('getAllProducts error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT 
                p.*,
                c.name AS category_name,
                s.name AS supplier_name,
                s.contact_person AS supplier_contact,
                s.email AS supplier_email,
                COALESCE(SUM(inv.quantity), 0) AS total_stock
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             LEFT JOIN suppliers s ON p.supplier_id = s.id
             LEFT JOIN inventory inv ON p.id = inv.product_id
             WHERE p.id = $1
             GROUP BY p.id, c.name, s.name, s.contact_person, s.email`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        // Also fetch inventory breakdown by warehouse
        const inventory = await pool.query(
            `SELECT i.*, w.name AS warehouse_name, w.location
             FROM inventory i
             JOIN warehouses w ON i.warehouse_id = w.id
             WHERE i.product_id = $1`,
            [id]
        );

        res.json({
            success: true,
            data: { ...result.rows[0], inventory: inventory.rows }
        });
    } catch (err) {
        console.error('getProductById error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /api/products
const createProduct = async (req, res) => {
    try {
        const { name, description, sku, price, cost, category_id, supplier_id, brand, image_url } = req.body;

        // Validation
        if (!name || name.trim().length < 2)
            return res.status(400).json({ success: false, error: 'Name must be at least 2 characters' });
        if (!sku || sku.trim().length < 2)
            return res.status(400).json({ success: false, error: 'SKU must be at least 2 characters' });
        if (price === undefined || price === null || isNaN(price) || Number(price) < 0)
            return res.status(400).json({ success: false, error: 'Price must be a non-negative number' });
        if (cost === undefined || cost === null || isNaN(cost) || Number(cost) < 0)
            return res.status(400).json({ success: false, error: 'Cost must be a non-negative number' });
        if (Number(cost) > Number(price))
            return res.status(400).json({ success: false, error: 'Cost cannot be greater than price' });

        // SKU uniqueness check
        const existing = await pool.query('SELECT id FROM products WHERE sku = $1', [sku.trim()]);
        if (existing.rows.length > 0)
            return res.status(409).json({ success: false, error: `SKU "${sku}" already exists` });

        const result = await pool.query(
            `INSERT INTO products (name, description, sku, price, cost, category_id, supplier_id, brand, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                name.trim(), description || null, sku.trim(),
                Number(price), Number(cost),
                category_id || null, supplier_id || null,
                brand || null, image_url || null
            ]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('createProduct error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// PUT /api/products/:id
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, sku, price, cost, category_id, supplier_id, brand, image_url, is_active } = req.body;

        // Check exists
        const existing = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (existing.rows.length === 0)
            return res.status(404).json({ success: false, error: 'Product not found' });

        // Validation
        if (name !== undefined && name.trim().length < 2)
            return res.status(400).json({ success: false, error: 'Name must be at least 2 characters' });
        if (sku !== undefined && sku.trim().length < 2)
            return res.status(400).json({ success: false, error: 'SKU must be at least 2 characters' });

        const current = existing.rows[0];
        const newPrice = price !== undefined ? Number(price) : Number(current.price);
        const newCost = cost !== undefined ? Number(cost) : Number(current.cost);

        if (newPrice < 0) return res.status(400).json({ success: false, error: 'Price cannot be negative' });
        if (newCost < 0) return res.status(400).json({ success: false, error: 'Cost cannot be negative' });
        if (newCost > newPrice) return res.status(400).json({ success: false, error: 'Cost cannot be greater than price' });

        // SKU uniqueness if changed
        if (sku && sku.trim() !== current.sku) {
            const skuCheck = await pool.query('SELECT id FROM products WHERE sku = $1 AND id != $2', [sku.trim(), id]);
            if (skuCheck.rows.length > 0)
                return res.status(409).json({ success: false, error: `SKU "${sku}" already exists` });
        }

        const result = await pool.query(
            `UPDATE products
             SET name = $1, description = $2, sku = $3, price = $4, cost = $5,
                 category_id = $6, supplier_id = $7, brand = $8, image_url = $9, is_active = $10,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $11
             RETURNING *`,
            [
                name !== undefined ? name.trim() : current.name,
                description !== undefined ? description : current.description,
                sku !== undefined ? sku.trim() : current.sku,
                newPrice, newCost,
                category_id !== undefined ? category_id : current.category_id,
                supplier_id !== undefined ? supplier_id : current.supplier_id,
                brand !== undefined ? brand : current.brand,
                image_url !== undefined ? image_url : current.image_url,
                is_active !== undefined ? is_active : current.is_active,
                id
            ]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('updateProduct error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await pool.query('SELECT id, name FROM products WHERE id = $1', [id]);
        if (existing.rows.length === 0)
            return res.status(404).json({ success: false, error: 'Product not found' });

        // Block delete if inventory records exist (mirrors Product.js deleteById logic)
        const invCheck = await pool.query('SELECT id FROM inventory WHERE product_id = $1 LIMIT 1', [id]);
        if (invCheck.rows.length > 0)
            return res.status(409).json({ success: false, error: 'Cannot delete product with existing inventory records' });

        await pool.query('DELETE FROM products WHERE id = $1', [id]);

        res.json({ success: true, message: `Product "${existing.rows[0].name}" deleted` });
    } catch (err) {
        console.error('deleteProduct error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// PATCH /api/products/:id/toggle-status
const toggleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE products SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 RETURNING id, name, is_active`,
            [id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ success: false, error: 'Product not found' });

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('toggleStatus error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct, toggleStatus };