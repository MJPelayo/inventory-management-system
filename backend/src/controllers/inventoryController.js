// backend/src/controllers/inventoryController.js
const { Inventory } = require('../models/Inventory');
const { StockMovement } = require('../models/StockMovement');
const pool = require('../db/pool');

const inventoryController = {
    async getWarehouseInventory(req, res) {
        try {
            const warehouseId = parseInt(req.params.warehouseId);
            const inventory = await Inventory.findByWarehouse(warehouseId);
            res.status(200).json({
                success: true,
                data: inventory,
                count: inventory.length
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    async getLowStock(req, res) {
        try {
            const lowStock = await Inventory.getLowStock();
            res.status(200).json({
                success: true,
                data: lowStock,
                count: lowStock.length
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    async getMovements(req, res) {
        try {
            const { product_id, limit = 100 } = req.query;
            
            let query = `
                SELECT sm.*, u.name as performed_by_name, w.name as warehouse_name, p.name as product_name
                FROM stock_movements sm
                JOIN users u ON sm.performed_by = u.id
                JOIN warehouses w ON sm.warehouse_id = w.id
                JOIN products p ON sm.product_id = p.id
            `;
            
            const params = [];
            
            if (product_id) {
                query += ` WHERE sm.product_id = $1`;
                params.push(parseInt(product_id));
            }
            
            query += ` ORDER BY sm.created_at DESC LIMIT $${params.length + 1}`;
            params.push(parseInt(limit));
            
            const result = await pool.query(query, params);
            
            res.status(200).json({
                success: true,
                data: result.rows,
                count: result.rows.length
            });
        } catch (error) {
            console.error('Failed to get movements:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async receiveStock(req, res) {
        try {
            const { product_id, warehouse_id, quantity, reason } = req.body;
            const userId = req.user?.id || 1;
            
            const inventory = await Inventory.findByProductAndWarehouse(product_id, warehouse_id);
            if (!inventory) {
                return res.status(404).json({ success: false, error: 'Inventory not found' });
            }
            
            // Update quantity
            const client = await pool.connect();
            try {
                await client.query(
                    'UPDATE inventory SET quantity = quantity + $1 WHERE product_id = $2 AND warehouse_id = $3',
                    [quantity, product_id, warehouse_id]
                );
                
                // Record movement
                const movement = new StockMovement({
                    product_id, warehouse_id, quantity_change: quantity,
                    movement_type: 'received', reason, performed_by: userId
                });
                await movement.record();
                
                res.status(200).json({ success: true, message: 'Stock received successfully' });
            } finally {
                client.release();
            }
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },

    async transferStock(req, res) {
        try {
            const { product_id, from_warehouse_id, to_warehouse_id, quantity, reason } = req.body;
            const userId = req.user?.id || 1;
            
            // Check source inventory
            const fromInventory = await Inventory.findByProductAndWarehouse(product_id, from_warehouse_id);
            if (!fromInventory) {
                return res.status(404).json({ success: false, error: 'Source inventory not found' });
            }
            
            if (fromInventory.quantity < quantity) {
                return res.status(400).json({ success: false, error: 'Insufficient stock for transfer' });
            }
            
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                // Reduce from source
                await client.query(
                    'UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2 AND warehouse_id = $3',
                    [quantity, product_id, from_warehouse_id]
                );
                
                // Add to destination
                await client.query(`
                    INSERT INTO inventory (product_id, warehouse_id, quantity, reorder_point, max_stock)
                    VALUES ($1, $2, $3, 10, 200)
                    ON CONFLICT (product_id, warehouse_id)
                    DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP
                `, [product_id, to_warehouse_id, quantity]);
                
                // Record outgoing movement
                const outgoingMovement = new StockMovement({
                    product_id, warehouse_id: from_warehouse_id, quantity_change: -quantity,
                    movement_type: 'transferred', reason: `${reason} - Transfer out`, performed_by: userId
                });
                await outgoingMovement.record();
                
                // Record incoming movement
                const incomingMovement = new StockMovement({
                    product_id, warehouse_id: to_warehouse_id, quantity_change: quantity,
                    movement_type: 'transferred', reason: `${reason} - Transfer in`, performed_by: userId
                });
                await incomingMovement.record();
                
                await client.query('COMMIT');
                
                res.status(200).json({ success: true, message: 'Stock transferred successfully' });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },

    async adjustStock(req, res) {
        try {
            const { product_id, warehouse_id, new_quantity, reason_code, notes } = req.body;
            const userId = req.user?.id || 1;
            
            // Validate input
            if (!product_id || !warehouse_id || new_quantity === undefined) {
                return res.status(400).json({
                    success: false,
                    error: 'product_id, warehouse_id, and new_quantity are required'
                });
            }
            
            // Get current inventory
            const inventory = await Inventory.findByProductAndWarehouse(product_id, warehouse_id);
            if (!inventory) {
                return res.status(404).json({
                    success: false,
                    error: 'Inventory record not found'
                });
            }
            
            const oldQuantity = inventory.quantity;
            const quantityChange = new_quantity - oldQuantity;
            
            // No change needed
            if (quantityChange === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'New quantity is same as current quantity'
                });
            }
            
            // Check if adjustment requires approval
            const reasonCheck = await pool.query(
                'SELECT requires_approval FROM adjustment_reasons WHERE reason_code = $1',
                [reason_code || 'COUNT_ERROR']
            );
            
            const requiresApproval = reasonCheck.rows[0]?.requires_approval || false;
            
            // Only admin can do adjustments that require approval
            if (requiresApproval && req.user?.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'This type of adjustment requires admin approval'
                });
            }
            
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                // Update inventory quantity
                await client.query(
                    `UPDATE inventory
                     SET quantity = $1, updated_at = CURRENT_TIMESTAMP
                     WHERE product_id = $2 AND warehouse_id = $3`,
                    [new_quantity, product_id, warehouse_id]
                );
                
                // Record stock movement
                const reason = `${reason_code || 'MANUAL_ADJUSTMENT'}: ${notes || 'Manual stock adjustment'}`;
                await client.query(
                    `INSERT INTO stock_movements
                     (product_id, warehouse_id, quantity_change, movement_type, reason, performed_by)
                     VALUES ($1, $2, $3, 'adjusted', $4, $5)`,
                    [product_id, warehouse_id, quantityChange, reason, userId]
                );
                
                await client.query('COMMIT');
                
                res.status(200).json({
                    success: true,
                    data: {
                        product_id,
                        warehouse_id,
                        old_quantity: oldQuantity,
                        new_quantity: new_quantity,
                        quantity_change: quantityChange
                    },
                    message: `Stock adjusted from ${oldQuantity} to ${new_quantity}`
                });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },

    async getReorderSuggestions(req, res) {
        try {
            // Calculate suggested reorder quantities based on:
            // 1. Current stock levels
            // 2. Reorder points
            // 3. Sales velocity (last 30 days)
            // 4. Supplier lead times
            const query = `
                WITH sales_velocity AS (
                    SELECT
                        oi.product_id,
                        COALESCE(SUM(oi.quantity) / 30.0, 0) as daily_sales_rate
                    FROM order_items oi
                    WHERE oi.order_type = 'sales'
                    AND oi.created_at > NOW() - INTERVAL '30 days'
                    GROUP BY oi.product_id
                )
                SELECT
                    p.id,
                    p.name,
                    p.sku,
                    i.quantity as current_stock,
                    i.reorder_point,
                    i.max_stock,
                    COALESCE(sv.daily_sales_rate, 0) as daily_sales_rate,
                    s.lead_time_days,
                    s.name as supplier_name,
                    s.id as supplier_id,
                    -- Calculate suggested order quantity
                    GREATEST(
                        -- Max stock minus current (to fill to max)
                        i.max_stock - i.quantity,
                        -- Safety stock calculation (daily sales × lead time × 1.5)
                        CEIL(COALESCE(sv.daily_sales_rate, 5) * s.lead_time_days * 1.5) - i.quantity,
                        -- Minimum order of reorder point
                        i.reorder_point,
                        0
                    ) as suggested_quantity,
                    -- Priority flag (red = critical, yellow = warning, green = ok)
                    CASE
                        WHEN i.quantity <= i.reorder_point THEN 'critical'
                        WHEN i.quantity <= i.reorder_point * 2 THEN 'warning'
                        ELSE 'ok'
                    END as priority
                FROM inventory i
                JOIN products p ON i.product_id = p.id
                JOIN suppliers s ON p.supplier_id = s.id
                LEFT JOIN sales_velocity sv ON sv.product_id = p.id
                WHERE i.quantity <= i.max_stock  -- Only products that need attention
                ORDER BY
                    CASE
                        WHEN i.quantity <= i.reorder_point THEN 1
                        WHEN i.quantity <= i.reorder_point * 2 THEN 2
                        ELSE 3
                    END,
                    (i.quantity::float / NULLIF(i.reorder_point, 1)) ASC
                LIMIT 30
            `;
            
            const result = await pool.query(query);
            
            res.status(200).json({
                success: true,
                data: result.rows,
                count: result.rows.length,
                message: 'Auto-reorder suggestions based on sales velocity and lead time'
            });
        } catch (error) {
            console.error('Reorder suggestions error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = inventoryController;