// backend/src/routes/warehouseTransactionRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllTransactions,
    getTransactionById,
    getTransactionsByWarehouse,
    getTransactionsByProduct,
    getTransactionStats,
    getMovementTypeBreakdown
} = require('../controllers/warehouseTransactionController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// GET /api/warehouse-transactions - Get all transactions with pagination
router.get('/', 
    authorize('warehouse:read_transactions', 'stock:read', 'report:view_all'), 
    getAllTransactions
);

// GET /api/warehouse-transactions/stats - Get transaction statistics
router.get('/stats', 
    authorize('warehouse:read_transactions', 'stock:read', 'report:view_all'), 
    getTransactionStats
);

// GET /api/warehouse-transactions/movement-types - Get movement type breakdown
router.get('/movement-types', 
    authorize('warehouse:read_transactions', 'stock:read'), 
    getMovementTypeBreakdown
);

// GET /api/warehouse-transactions/warehouse/:warehouse_id - Get transactions by warehouse
router.get('/warehouse/:warehouse_id', 
    authorize('warehouse:read_transactions', 'stock:read'), 
    getTransactionsByWarehouse
);

// GET /api/warehouse-transactions/product/:product_id - Get transactions by product
router.get('/product/:product_id', 
    authorize('warehouse:read_transactions', 'stock:read'), 
    getTransactionsByProduct
);

// GET /api/warehouse-transactions/:id - Get single transaction
router.get('/:id', 
    authorize('warehouse:read_transactions', 'stock:read'), 
    getTransactionById
);

module.exports = router;