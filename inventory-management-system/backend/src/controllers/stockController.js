// backend/src/controllers/stockController.js
const pool = require('../db/pool');
const { createAuditLog } = require('./auditController');

// GET /api/stock/movements - Get all stock movements
const getStockMovements = async (req, res) => {
    try {
        const { warehouse_id, product_id, movement_type, limit = 100 } = req.query;
        
        const conditions = ['1=1'];
        const values = [];
        let paramCount = 1;

        if (warehouse_id) {
            conditions.push(`sm.warehouse_id = $${paramCount++}`);
            values.push(warehouse_id);
        }
        if (product_id) {
            conditions.push(`sm.product_id = $${paramCount++}`);
            values.push(product_id);
        }
        if (movement_type) {
            conditions.push(`sm.movement_type = $${paramCount++}`);
            values.push(movement_type);
        }

        const result = await pool.query(
            `SELECT 
                sm.*,
                p.name AS product_name,
                p.sku,
                w.name AS warehouse_name,
                u.name AS performed_by_name
             FROM stock_movements sm
             JOIN products p ON sm.product_id = p.id
             JOIN warehouses w ON sm.warehouse_id = w.id
             LEFT JOIN users u ON sm.performed_by = u.id
             WHERE ${conditions.join(' AND ')}
             ORDER BY sm.created_at DESC
             LIMIT $${paramCount}`,
            [...values, parseInt(limit)]
        );

        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error('getStockMovements error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /api/stock/receive - Receive stock into warehouse
const receiveStock = async (req, res) => {
    const client = await pool.connect();
    try {
        const { product_id, warehouse_id, quantity, reason, reference_number, performed_by } = req.body;

        // Validate input
        if (!product_id || !warehouse_id || !quantity) {
            return res.status(400).json({ 
                success: false, 
                error: 'Product ID, warehouse ID, and quantity are required' 
            });
        }

        if (isNaN(quantity) || quantity <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Quantity must be a positive number' 
            });
        }

        // Check if product exists
        const product = await client.query('SELECT * FROM products WHERE id = $1', [product_id]);
        if (product.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        // Check if warehouse exists
        const warehouse = await client.query('SELECT * FROM warehouses WHERE id = $1', [warehouse_id]);
        if (warehouse.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Warehouse not found' });
        }

        await client.query('BEGIN');

        // Create or update inventory record
        const existingInventory = await client.query(
            'SELECT * FROM inventory WHERE product_id = $1 AND warehouse_id = $2',
            [product_id, warehouse_id]
        );

        if (existingInventory.rows.length > 0) {
            // Update existing inventory
            await client.query(
                `UPDATE inventory 
                 SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP 
                 WHERE product_id = $2 AND warehouse_id = $3`,
                [quantity, product_id, warehouse_id]
            );
        } else {
            // Create new inventory record
            await client.query(
                `INSERT INTO inventory (product_id, warehouse_id, quantity, reorder_point, max_stock)
                 VALUES ($1, $2, $3, 10, 1000)`,
                [product_id, warehouse_id, quantity]
            );
        }

        // Record stock movement
        const movementResult = await client.query(
            `INSERT INTO stock_movements (product_id, warehouse_id, quantity_change, movement_type, reason, reference_number, performed_by)
             VALUES ($1, $2, $3, 'received', $4, $5, $6)
             RETURNING *`,
            [product_id, warehouse_id, quantity, reason || null, reference_number || null, performed_by || null]
        );

        // Update warehouse occupancy
        await client.query(
            `UPDATE warehouses 
             SET current_occupancy = current_occupancy + $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [quantity, warehouse_id]
        );

        await client.query('COMMIT');

        // Log the receive action
        const user = req.user;
        await createAuditLog({
            user_id: user ? user.id : null,
            user_name: user ? user.name : 'System',
            action: 'receive',
            entity_type: 'inventory',
            entity_id: product_id,
            entity_name: product.rows[0].name,
            new_values: { warehouse_id, quantity, reason: reason || null },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
            notes: `Received ${quantity} units at warehouse ${warehouse_id}`
        });

        res.status(201).json({
            success: true,
            message: `Received ${quantity} units of ${product.rows[0].name}`,
            data: movementResult.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('receiveStock error:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
};

// POST /api/stock/transfer - Transfer stock between warehouses
const transferStock = async (req, res) => {
    const client = await pool.connect();
    try {
        const { product_id, from_warehouse_id, to_warehouse_id, quantity, reason, reference_number, performed_by } = req.body;

        // Validate input
        if (!product_id || !from_warehouse_id || !to_warehouse_id || !quantity) {
            return res.status(400).json({ 
                success: false, 
                error: 'Product ID, source warehouse, destination warehouse, and quantity are required' 
            });
        }

        if (from_warehouse_id === to_warehouse_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Source and destination warehouses must be different' 
            });
        }

        if (isNaN(quantity) || quantity <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Quantity must be a positive number' 
            });
        }

        await client.query('BEGIN');

        // Check source inventory
        const sourceInventory = await client.query(
            'SELECT * FROM inventory WHERE product_id = $1 AND warehouse_id = $2',
            [product_id, from_warehouse_id]
        );

        if (sourceInventory.rows.length === 0 || sourceInventory.rows[0].quantity < quantity) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                error: 'Insufficient stock in source warehouse' 
            });
        }

        // Decrease source inventory
        await client.query(
            `UPDATE inventory 
             SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP 
             WHERE product_id = $2 AND warehouse_id = $3`,
            [quantity, product_id, from_warehouse_id]
        );

        // Increase or create destination inventory
        const destInventory = await client.query(
            'SELECT * FROM inventory WHERE product_id = $1 AND warehouse_id = $2',
            [product_id, to_warehouse_id]
        );

        if (destInventory.rows.length > 0) {
            await client.query(
                `UPDATE inventory 
                 SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP 
                 WHERE product_id = $2 AND warehouse_id = $3`,
                [quantity, product_id, to_warehouse_id]
            );
        } else {
            await client.query(
                `INSERT INTO inventory (product_id, warehouse_id, quantity, reorder_point, max_stock)
                 VALUES ($1, $2, $3, 10, 1000)`,
                [product_id, to_warehouse_id, quantity]
            );
        }

        // Record outgoing movement
        await client.query(
            `INSERT INTO stock_movements (product_id, warehouse_id, quantity_change, movement_type, reason, reference_number, performed_by)
             VALUES ($1, $2, $3, 'transferred', $4, $5, $6)`,
            [-quantity, from_warehouse_id, quantity, reason || null, reference_number || null, performed_by || null]
        );

        // Record incoming movement
        await client.query(
            `INSERT INTO stock_movements (product_id, warehouse_id, quantity_change, movement_type, reason, reference_number, performed_by)
             VALUES ($1, $2, $3, 'transferred', $4, $5, $6)`,
            [quantity, to_warehouse_id, quantity, reason || null, reference_number || null, performed_by || null]
        );

        // Update warehouse occupancies
        await client.query(
            `UPDATE warehouses 
             SET current_occupancy = current_occupancy - $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [quantity, from_warehouse_id]
        );

        await client.query(
            `UPDATE warehouses 
             SET current_occupancy = current_occupancy + $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [quantity, to_warehouse_id]
        );

        await client.query('COMMIT');

        const product = await client.query('SELECT name FROM products WHERE id = $1', [product_id]);
        
        // Log the transfer action
        const user = req.user;
        await createAuditLog({
            user_id: user ? user.id : null,
            user_name: user ? user.name : 'System',
            action: 'transfer',
            entity_type: 'inventory',
            entity_id: product_id,
            entity_name: product.rows[0].name,
            new_values: { from_warehouse_id, to_warehouse_id, quantity },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
            notes: `Transferred ${quantity} units from warehouse ${from_warehouse_id} to ${to_warehouse_id}`
        });

        res.json({
            success: true,
            message: `Transferred ${quantity} units of ${product.rows[0].name}`,
            data: {
                product_id,
                product_name: product.rows[0].name,
                from_warehouse_id,
                to_warehouse_id,
                quantity
            }
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('transferStock error:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
};

// POST /api/stock/adjust - Adjust stock (correction)
const adjustStock = async (req, res) => {
    const client = await pool.connect();
    try {
        const { product_id, warehouse_id, quantity, reason, reference_number, performed_by } = req.body;

        // Validate input
        if (!product_id || !warehouse_id || !reason) {
            return res.status(400).json({ 
                success: false, 
                error: 'Product ID, warehouse ID, and reason are required' 
            });
        }

        if (isNaN(quantity) || quantity === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Quantity adjustment must be non-zero' 
            });
        }

        await client.query('BEGIN');

        // Check inventory exists
        const inventory = await client.query(
            'SELECT * FROM inventory WHERE product_id = $1 AND warehouse_id = $2',
            [product_id, warehouse_id]
        );

        if (inventory.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                error: 'Inventory record not found' 
            });
        }

        const currentQty = inventory.rows[0].quantity;
        const newQty = currentQty + quantity;

        if (newQty < 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                error: 'Adjustment would result in negative stock' 
            });
        }

        // Update inventory
        await client.query(
            `UPDATE inventory 
             SET quantity = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE product_id = $2 AND warehouse_id = $3`,
            [newQty, product_id, warehouse_id]
        );

        // Record movement
        const movementResult = await client.query(
            `INSERT INTO stock_movements (product_id, warehouse_id, quantity_change, movement_type, reason, reference_number, performed_by)
             VALUES ($1, $2, $3, 'adjusted', $4, $5, $6)
             RETURNING *`,
            [product_id, warehouse_id, quantity, reason, reference_number || null, performed_by || null]
        );

        // Update warehouse occupancy
        await client.query(
            `UPDATE warehouses 
             SET current_occupancy = current_occupancy + $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [quantity, warehouse_id]
        );

        await client.query('COMMIT');

        // Log the adjust action
        const user = req.user;
        await createAuditLog({
            user_id: user ? user.id : null,
            user_name: user ? user.name : 'System',
            action: 'adjust',
            entity_type: 'inventory',
            entity_id: product_id,
            entity_name: `${product_id} (${warehouse_id})`,
            old_values: { quantity: currentQty },
            new_values: { quantity: newQty, change: quantity },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
            notes: `Adjusted stock by ${quantity > 0 ? '+' : ''}${quantity} units. Reason: ${reason}`
        });

        res.json({
            success: true,
            message: `Adjusted stock by ${quantity > 0 ? '+' : ''}${quantity} units`,
            data: {
                ...movementResult.rows[0],
                previous_quantity: currentQty,
                new_quantity: newQty
            }
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('adjustStock error:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
};

// GET /api/stock/inventory - Get inventory with filters
const getInventory = async (req, res) => {
    try {
        const { warehouse_id, product_id, low_stock, search } = req.query;
        
        const conditions = ['1=1'];
        const values = [];
        let paramCount = 1;

        if (warehouse_id) {
            conditions.push(`i.warehouse_id = $${paramCount++}`);
            values.push(warehouse_id);
        }
        if (product_id) {
            conditions.push(`i.product_id = $${paramCount++}`);
            values.push(product_id);
        }
        if (low_stock === 'true') {
            conditions.push(`i.quantity <= i.reorder_point`);
        }
        if (search) {
            conditions.push(`(p.name ILIKE $${paramCount} OR p.sku ILIKE $${paramCount})`);
            values.push(`%${search}%`);
            paramCount++;
        }

        const result = await pool.query(
            `SELECT 
                i.*,
                p.name AS product_name,
                p.sku,
                p.brand,
                p.price,
                p.cost,
                c.name AS category_name,
                w.name AS warehouse_name,
                CASE 
                    WHEN i.quantity = 0 THEN 'out_of_stock'
                    WHEN i.quantity <= i.reorder_point THEN 'low_stock'
                    WHEN i.quantity >= i.max_stock THEN 'overstocked'
                    ELSE 'in_stock'
                END AS stock_status
             FROM inventory i
             JOIN products p ON i.product_id = p.id
             JOIN warehouses w ON i.warehouse_id = w.id
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE ${conditions.join(' AND ')}
             ORDER BY p.name ASC`,
            values
        );

        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error('getInventory error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/stock/locations - Get product locations within warehouse
const getProductLocations = async (req, res) => {
    try {
        const { warehouse_id, product_id } = req.params;
        
        const conditions = [];
        const values = [];
        let paramCount = 1;

        if (warehouse_id) {
            conditions.push(`pl.warehouse_id = $${paramCount++}`);
            values.push(warehouse_id);
        }
        if (product_id) {
            conditions.push(`pl.product_id = $${paramCount++}`);
            values.push(product_id);
        }

        const query = conditions.length > 0 
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        const result = await pool.query(
            `SELECT 
                pl.*,
                p.name AS product_name,
                p.sku,
                w.name AS warehouse_name
             FROM product_locations pl
             JOIN products p ON pl.product_id = p.id
             JOIN warehouses w ON pl.warehouse_id = w.id
             ${query}
             ORDER BY pl.warehouse_id, pl.aisle_number, pl.shelf_number, pl.layer`,
            values
        );

        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error('getProductLocations error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /api/stock/location - Add/update product location
const setProductLocation = async (req, res) => {
    try {
        const { product_id, warehouse_id, aisle_number, side, shelf_number, layer, quantity } = req.body;

        // Validate input
        if (!product_id || !warehouse_id || !aisle_number || !side || !shelf_number || !layer) {
            return res.status(400).json({ 
                success: false, 
                error: 'All location fields are required' 
            });
        }

        if (!['left', 'right'].includes(side)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Side must be "left" or "right"' 
            });
        }

        if (!['top', 'middle', 'middle2', 'middle3', 'bottom'].includes(layer)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Layer must be top, middle, middle2, middle3, or bottom' 
            });
        }

        const result = await pool.query(
            `INSERT INTO product_locations (product_id, warehouse_id, aisle_number, side, shelf_number, layer, quantity)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (product_id, warehouse_id, aisle_number, side, shelf_number, layer)
             DO UPDATE SET quantity = $7, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [product_id, warehouse_id, aisle_number, side, shelf_number, layer, quantity || 0]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('setProductLocation error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getStockMovements,
    receiveStock,
    transferStock,
    adjustStock,
    getInventory,
    getProductLocations,
    setProductLocation
};