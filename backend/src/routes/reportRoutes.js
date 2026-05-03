/**
 * Report Routes
 * All report endpoints require authentication
 *
 * @module routes/reportRoutes
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const inventoryReportController = require('../controllers/inventoryReportController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Sales Report - Admin and Sales can access
router.get('/sales',
    authenticateToken,
    authorize('admin', 'sales'),
    reportController.getSalesReport
);

// Inventory Report - Admin and Warehouse can access
router.get('/inventory',
    authenticateToken,
    authorize('admin', 'warehouse'),
    inventoryReportController.getInventoryReport
);

// Export Inventory Report as CSV - Admin and Warehouse can access
router.get('/inventory/export',
    authenticateToken,
    authorize('admin', 'warehouse'),
    inventoryReportController.exportInventoryReport
);

// Supplier Report - Admin and Supply can access
router.get('/suppliers',
    authenticateToken,
    authorize('admin', 'supply'),
    reportController.getSupplierReport
);

module.exports = router;