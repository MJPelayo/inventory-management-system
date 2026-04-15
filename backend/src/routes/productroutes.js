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

// GET    /api/products              — list all, supports ?search=&category_id=&supplier_id=&is_active=&sort=&order=
// POST   /api/products              — create new product
router.route('/')
    .get(getAllProducts)
    .post(createProduct);

// PATCH  /api/products/:id/toggle-status  — flip is_active (must be before /:id)
router.patch('/:id/toggle-status', toggleStatus);

// GET    /api/products/:id          — get single product + inventory breakdown
// PUT    /api/products/:id          — full update
// DELETE /api/products/:id          — delete (blocked if inventory exists)
router.route('/:id')
    .get(getProductById)
    .put(updateProduct)
    .delete(deleteProduct);

module.exports = router;