/**
 * Audit Log Routes
 * 
 * @module routes/auditLogRoutes
 */

const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { authenticateToken, authorize } = require('../middleware/auth');

// All audit log endpoints require admin authentication
router.use(authenticateToken);
router.use(authorize('admin'));

// Get audit logs
router.get('/', auditLogController.getAuditLogs);

// Get audit logs for specific entity
router.get('/entity/:entityType/:entityId', auditLogController.getEntityAuditLogs);

module.exports = router;