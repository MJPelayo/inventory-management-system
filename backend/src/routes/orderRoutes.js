// backend/src/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Sales Orders
router.post('/sales', orderController.createSalesOrder);
router.get('/sales', orderController.getSalesOrders);
router.get('/sales/:id', orderController.getSalesOrderById);
router.put('/sales/:id/status', orderController.updateOrderStatus);

// Supply Orders
router.post('/supply', orderController.createSupplyOrder);
router.get('/supply', orderController.getSupplyOrders);
router.get('/supply/:id', orderController.getSupplyOrderById);
router.post('/supply/:id/receive', orderController.receiveSupplyOrder);

module.exports = router;
