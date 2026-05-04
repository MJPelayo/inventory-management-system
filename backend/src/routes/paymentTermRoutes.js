const express = require('express');
const router = express.Router();
const paymentTermController = require('../controllers/paymentTermController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, paymentTermController.getAllPaymentTerms);
router.get('/:id', authenticateToken, paymentTermController.getPaymentTermById);

module.exports = router;