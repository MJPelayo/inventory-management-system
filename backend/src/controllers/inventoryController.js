// backend/src/controllers/inventoryController.js
const { Inventory } = require('../models/Inventory');
const { StockMovement } = require('../models/StockMovement');

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
    }
};

module.exports = inventoryController;