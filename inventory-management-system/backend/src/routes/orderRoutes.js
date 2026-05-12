// backend/src/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    updatePaymentStatus,
    getOrderStats
} = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All order routes require authentication
router.use(authenticate);

// GET /api/orders - List all orders (sales and sales_manager can read)
// POST /api/orders - Create new order (sales and sales_manager can create)
router.route('/')
    .get(authorize('order:read'), getAllOrders)
    .post(authorize('order:create'), createOrder);

// GET /api/orders/stats - Get order statistics
router.get('/stats', authorize('order:read'), getOrderStats);

// GET /api/orders/:id - Get single order
router.get('/:id', authorize('order:read'), getOrderById);

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status', authorize('order:update'), updateOrderStatus);

// PATCH /api/orders/:id/payment - Update payment status
router.patch('/:id/payment', authorize('order:update'), updatePaymentStatus);

module.exports = router;