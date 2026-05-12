// backend/src/routes/supplierRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    toggleSupplierStatus
} = require('../controllers/supplierController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// GET /api/suppliers - Get all suppliers (sales_manager, supply, admin)
router.get('/', 
    authorize('supplier:read', 'supplier:communicate', 'report:view_all'), 
    getAllSuppliers
);

// GET /api/suppliers/:id - Get single supplier
router.get('/:id', 
    authorize('supplier:read', 'supplier:communicate'), 
    getSupplierById
);

// POST /api/suppliers - Create new supplier (supply, admin)
router.post('/', 
    authorize('supplier:create'), 
    createSupplier
);

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', 
    authorize('supplier:update'), 
    updateSupplier
);

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', 
    authorize('supplier:update'), 
    deleteSupplier
);

// PATCH /api/suppliers/:id/toggle-status - Toggle supplier status
router.patch('/:id/toggle-status', 
    authorize('supplier:update'), 
    toggleSupplierStatus
);

module.exports = router;