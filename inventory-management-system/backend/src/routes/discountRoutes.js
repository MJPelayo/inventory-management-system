// backend/src/routes/discountRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllDiscounts,
    getDiscountById,
    getActiveDiscountByProduct,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    toggleDiscountStatus,
    getDiscountStats
} = require('../controllers/discountController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// GET /api/discounts - Get all discounts
router.get('/', 
    authorize('discount:read', 'product:read', 'report:view_all'), 
    getAllDiscounts
);

// GET /api/discounts/stats - Get discount statistics
router.get('/stats', 
    authorize('discount:read', 'report:view_all'), 
    getDiscountStats
);

// GET /api/discounts/product/:product_id/active - Get active discount for a product
router.get('/product/:product_id/active', 
    authorize('discount:read', 'product:read'), 
    getActiveDiscountByProduct
);

// GET /api/discounts/:id - Get single discount
router.get('/:id', 
    authorize('discount:read'), 
    getDiscountById
);

// POST /api/discounts - Create new discount (sales_manager, admin)
router.post('/', 
    authorize('discount:create', 'product:update_discount'), 
    createDiscount
);

// PUT /api/discounts/:id - Update discount
router.put('/:id', 
    authorize('discount:update', 'product:update_discount'), 
    updateDiscount
);

// DELETE /api/discounts/:id - Delete discount
router.delete('/:id', 
    authorize('discount:delete'), 
    deleteDiscount
);

// PATCH /api/discounts/:id/toggle - Toggle discount status
router.patch('/:id/toggle', 
    authorize('discount:update', 'product:update_discount'), 
    toggleDiscountStatus
);

module.exports = router;