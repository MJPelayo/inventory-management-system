const express = require('express');
const router = express.Router();
const dropdownController = require('../controllers/dropdownController');
const { authenticateToken } = require('../middleware/auth');

// Get all dropdowns in one call (efficient!)
router.get('/all', authenticateToken, dropdownController.getAllDropdowns);

// Individual endpoints (for specific needs)
router.get('/payment-terms', authenticateToken, dropdownController.getPaymentTerms);
router.get('/delivery-types', authenticateToken, dropdownController.getDeliveryTypes);
router.get('/order-statuses', authenticateToken, dropdownController.getOrderStatuses);
router.get('/payment-statuses', authenticateToken, dropdownController.getPaymentStatuses);
router.get('/user-roles', authenticateToken, dropdownController.getUserRoles);
router.get('/shipping-methods', authenticateToken, dropdownController.getShippingMethods);

module.exports = router;