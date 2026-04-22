/**
 * Export Routes
 * Data export endpoints - Admin only
 * 
 * @module routes/exportRoutes
 */

const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { authenticateToken, authorize } = require('../middleware/auth');

// All export endpoints require admin authentication
router.use(authenticateToken);
router.use(authorize('admin'));

// Export endpoints
router.get('/users', exportController.exportUsers);
router.get('/products', exportController.exportProducts);
router.get('/inventory', exportController.exportInventory);

module.exports = router;