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
            const { product_id } = req.query;
            if (!product_id) {
                return res.status(400).json({ success: false, error: 'product_id is required' });
            }
            const movements = await StockMovement.getProductHistory(parseInt(product_id));
            res.status(200).json({
                success: true,
                data: movements,
                count: movements.length
            });
        } catch (error) {
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
    }
};

module.exports = inventoryController;