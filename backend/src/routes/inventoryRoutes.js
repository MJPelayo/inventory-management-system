// backend/src/routes/inventoryRoutes.js
const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

router.get('/warehouse/:warehouseId', inventoryController.getWarehouseInventory);
router.get('/low-stock', inventoryController.getLowStock);
router.get('/movements', inventoryController.getMovements);
router.post('/receive', inventoryController.receiveStock);
router.post('/transfer', inventoryController.transferStock);

module.exports = router;
