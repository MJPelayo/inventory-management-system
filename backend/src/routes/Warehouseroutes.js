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

// GET  /api/warehouses        — list all, supports ?search=&is_active=
// POST /api/warehouses        — create
router.route('/')
    .get(getAllWarehouses)
    .post(createWarehouse);

// PATCH /api/warehouses/:id/toggle-status
router.patch('/:id/toggle-status', toggleStatus);

// GET    /api/warehouses/:id  — single warehouse + inventory breakdown
// PUT    /api/warehouses/:id  — update
// DELETE /api/warehouses/:id  — blocked if inventory exists
router.route('/:id')
    .get(getWarehouseById)
    .put(updateWarehouse)
    .delete(deleteWarehouse);

module.exports = router;