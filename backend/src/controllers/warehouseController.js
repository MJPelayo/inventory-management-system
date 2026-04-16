// backend/src/controllers/warehouseController.js
const { Warehouse } = require('../models/Warehouse');

const warehouseController = {
    async getAllWarehouses(req, res) {
        try {
            const warehouses = await Warehouse.findAll();
            res.status(200).json({
                success: true,
                data: warehouses.map(w => w.toJSON()),
                count: warehouses.length
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getWarehouseById(req, res) {
        try {
            const warehouse = await Warehouse.findById(parseInt(req.params.id));
            if (!warehouse) {
                return res.status(404).json({ success: false, error: 'Warehouse not found' });
            }
            res.status(200).json({ success: true, data: warehouse.toJSON() });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async createWarehouse(req, res) {
        try {
            const { name, location, capacity } = req.body;
            
            if (!name) {
                return res.status(400).json({ success: false, error: 'Warehouse name is required' });
            }
            
            const warehouse = new Warehouse({ name, location, capacity });
            const saved = await warehouse.save();
            res.status(201).json({ success: true, data: saved.toJSON() });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },

    async updateWarehouse(req, res) {
        try {
            const warehouse = await Warehouse.findById(parseInt(req.params.id));
            if (!warehouse) {
                return res.status(404).json({ success: false, error: 'Warehouse not found' });
            }
            
            const { name, location, capacity, is_active } = req.body;
            
            if (name) warehouse.name = name;
            if (location !== undefined) warehouse.location = location;
            if (capacity !== undefined) warehouse.capacity = capacity;
            if (is_active !== undefined) warehouse.is_active = is_active;
            
            const updated = await warehouse.save();
            res.status(200).json({ success: true, data: updated.toJSON() });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },

    async deleteWarehouse(req, res) {
        try {
            const warehouse = await Warehouse.findById(parseInt(req.params.id));
            if (!warehouse) {
                return res.status(404).json({ success: false, error: 'Warehouse not found' });
            }
            
            // Check if warehouse has inventory
            const inventoryCheck = await warehouse.checkInventory();
            if (inventoryCheck) {
                return res.status(400).json({ success: false, error: 'Cannot delete warehouse with existing inventory' });
            }
            
            await warehouse.delete();
            res.status(200).json({ success: true, message: 'Warehouse deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = warehouseController;