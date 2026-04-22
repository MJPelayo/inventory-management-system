// backend/src/routes/inventoryRoutes.js
const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

router.get('/warehouse/:warehouseId', inventoryController.getWarehouseInventory);
router.get('/low-stock', inventoryController.getLowStock);
router.get('/movements', inventoryController.getMovements);
router.post('/receive', inventoryController.receiveStock);
router.post('/transfer', inventoryController.transferStock);

// ===== CHECKPOINT 3 - NEW ROUTES =====
router.post('/adjust', inventoryController.adjustStock);
router.get('/reorder-suggestions', inventoryController.getReorderSuggestions);

module.exports = router;
