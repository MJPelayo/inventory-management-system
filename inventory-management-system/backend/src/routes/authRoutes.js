// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// POST /api/auth/login - User login
router.post('/login', authController.login);

// POST /api/auth/logout - User logout
router.post('/logout', authController.logout);

// GET /api/auth/me - Get current user info (protected)
router.get('/me', authenticate, authController.me);

// GET /api/auth/roles - Get available roles (for admin)
router.get('/roles', authController.getAvailableRoles);

// PUT /api/auth/change-password - Change password (protected)
router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;