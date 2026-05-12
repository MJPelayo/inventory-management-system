// backend/src/routes/auditRoutes.js
const express = require('express');
const router = express.Router();
const { getAuditLogs, getAuditSummary } = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All audit routes require authentication and admin or warehouse manager role
router.use(authenticate);

// GET /api/audit/logs - Get audit logs (admin, warehouse managers)
router.get('/logs', authorize('admin', 'warehouse:read'), getAuditLogs);

// GET /api/audit/summary - Get audit summary statistics (admin, warehouse managers)
router.get('/summary', authorize('admin', 'warehouse:read'), getAuditSummary);

module.exports = router;