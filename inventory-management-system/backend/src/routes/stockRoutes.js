// backend/src/routes/stockRoutes.js
const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All stock routes require authentication
router.use(authenticate);

// Inventory routes
router.get('/inventory', authorize('inventory:read'), stockController.getInventory);

// Stock movements
router.get('/movements', authorize('stock:read'), stockController.getStockMovements);

// Stock operations (warehouse role)
router.post('/receive', authorize('stock:receive'), stockController.receiveStock);
router.post('/transfer', authorize('stock:transfer'), stockController.transferStock);
router.post('/adjust', authorize('stock:adjust'), stockController.adjustStock);

// Product locations
router.get('/locations', authorize('inventory:read'), stockController.getProductLocations);
router.post('/location', authorize('inventory:update'), stockController.setProductLocation);

module.exports = router;