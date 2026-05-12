// backend/src/routes/productroutes.js
const express = require('express');
const router = express.Router();
const {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleStatus
} = require('../controllers/Productcontrollers');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All product routes require authentication
router.use(authenticate);

// GET /api/products - List all products (all roles can read)
// POST /api/products - Create new product (admin only)
router.route('/')
    .get(authorize('product:read'), getAllProducts)
    .post(authorize('product:create'), createProduct);

// PATCH /api/products/:id/toggle-status - Toggle product status (admin only)
router.patch('/:id/toggle-status', authorize('product:update'), toggleStatus);

// GET /api/products/:id - Get single product (all authenticated users)
// PUT /api/products/:id - Full update (admin only)
// DELETE /api/products/:id - Delete product (admin only)
router.route('/:id')
    .get(authorize('product:read'), getProductById)
    .put(authorize('product:update'), updateProduct)
    .delete(authorize('product:delete'), deleteProduct);

module.exports = router;