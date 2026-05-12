// backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All user routes require authentication
router.use(authenticate);

// GET /api/users - Get all users (admin only)
router.get('/', authorize('user:read'), userController.getAllUsers);

// GET /api/users/:id - Get user by ID (admin only)
router.get('/:id', authorize('user:read'), userController.getUserById);

// POST /api/users - Create new user (admin only)
router.post('/', authorize('user:create'), userController.createUser);

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', authorize('user:update'), userController.updateUser);

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authorize('user:delete'), userController.deleteUser);

module.exports = router;