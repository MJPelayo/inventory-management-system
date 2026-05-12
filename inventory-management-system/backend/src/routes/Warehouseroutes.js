// backend/src/routes/Warehouseroutes.js
const express = require('express');
const router = express.Router();
const {
    getAllWarehouses,
    getWarehouseById,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    toggleStatus
} = require('../controllers/Warehousecontroller');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All warehouse routes require authentication
router.use(authenticate);

// GET /api/warehouses - List all warehouses (warehouse, admin can read)
// POST /api/warehouses - Create warehouse (admin only)
router.route('/')
    .get(authorize('warehouse:read'), getAllWarehouses)
    .post(authorize('warehouse:create'), createWarehouse);

// PATCH /api/warehouses/:id/toggle-status - Toggle status (admin only)
router.patch('/:id/toggle-status', authorize('warehouse:update'), toggleStatus);

// GET /api/warehouses/:id - Get single warehouse (warehouse, admin can read)
// PUT /api/warehouses/:id - Update warehouse (admin only)
// DELETE /api/warehouses/:id - Delete warehouse (admin only)
router.route('/:id')
    .get(authorize('warehouse:read'), getWarehouseById)
    .put(authorize('warehouse:update'), updateWarehouse)
    .delete(authorize('warehouse:delete'), deleteWarehouse);

module.exports = router;