// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, refreshTokenHandler } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.getMe);
router.post('/refresh', refreshTokenHandler);

module.exports = router;