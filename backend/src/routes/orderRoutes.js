// backend/src/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Sales Orders
router.post('/sales', orderController.createSalesOrder);
router.get('/sales', orderController.getSalesOrders);
router.get('/sales/:id', orderController.getSalesOrderById);
router.put('/sales/:id/status', orderController.updateOrderStatus);

// Discount Approval
router.post('/sales/:id/discount-request', orderController.requestDiscountApproval);
router.put('/sales/:id/discount-approve', authenticateToken, authorize('admin'), orderController.approveDiscount);

// Supply Orders
router.post('/supply', orderController.createSupplyOrder);
router.get('/supply', orderController.getSupplyOrders);
router.get('/supply/:id', orderController.getSupplyOrderById);
router.post('/supply/:id/receive', orderController.receiveSupplyOrder);
router.post('/supply/:id/cancel', authenticateToken, authorize('supply', 'admin'), orderController.cancelSupplyOrder);

module.exports = router;
