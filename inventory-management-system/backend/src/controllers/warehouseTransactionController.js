// backend/src/controllers/warehouseTransactionController.js
const pool = require('../db/pool');

// GET /api/warehouse-transactions - Get all warehouse transactions (stock movements)
const getAllTransactions = async (req, res) => {
    try {
        const { 
            warehouse_id, 
            product_id, 
            movement_type, 
            start_date, 
            end_date, 
            search,
            page = 1,
            limit = 50 
        } = req.query;

        const conditions = ['1=1'];
        const values = [];
        let i = 1;

        if (warehouse_id) {
            conditions.push(`sm.warehouse_id = $${i++}`);
            values.push(parseInt(warehouse_id));
        }
        if (product_id) {
            conditions.push(`sm.product_id = $${i++}`);
            values.push(parseInt(product_id));
        }
        if (movement_type) {
            conditions.push(`sm.movement_type = $${i++}`);
            values.push(movement_type);
        }
        if (start_date) {
            conditions.push(`sm.created_at >= $${i++}`);
            values.push(new Date(start_date));
        }
        if (end_date) {
            conditions.push(`sm.created_at <= $${i++}`);
            values.push(new Date(end_date));
        }
        if (search) {
            conditions.push(`(p.name ILIKE $${i} OR p.sku ILIKE $${i + 1} OR sm.reason ILIKE $${i + 2})`);
            values.push(`%${search}%`, `%${search}%`, `%${search}%`);
            i += 3;
        }

        // Get total count for pagination
        const countResult = await pool.query(
            `SELECT COUNT(*) as total
             FROM stock_movements sm
             JOIN products p ON sm.product_id = p.id
             WHERE ${conditions.join(' AND ')}`,
            values
        );

        const total = parseInt(countResult.rows[0].total);
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const result = await pool.query(
            `SELECT 
                sm.*,
                p.name AS product_name,
                p.sku,
                p.price,
                w.name AS warehouse_name,
                w.location AS warehouse_location,
                u.name AS performed_by_name,
                u.email AS performed_by_email
             FROM stock_movements sm
             JOIN products p ON sm.product_id = p.id
             JOIN warehouses w ON sm.warehouse_id = w.id
             LEFT JOIN users u ON sm.performed_by = u.id
             WHERE ${conditions.join(' AND ')}
             ORDER BY sm.created_at DESC
             LIMIT $${i++} OFFSET $${i++}`,
            [...values, parseInt(limit), offset]
        );

        res.json({ 
            success: true, 
            count: result.rows.length,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit)),
            data: result.rows 
        });
    } catch (err) {
        console.error('getAllTransactions error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/warehouse-transactions/:id - Get single transaction
const getTransactionById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT 
                sm.*,
                p.name AS product_name,
                p.sku,
                p.price,
                p.description AS product_description,
                w.name AS warehouse_name,
                w.location AS warehouse_location,
                u.name AS performed_by_name,
                u.email AS performed_by_email
             FROM stock_movements sm
             JOIN products p ON sm.product_id = p.id
             JOIN warehouses w ON sm.warehouse_id = w.id
             LEFT JOIN users u ON sm.performed_by = u.id
             WHERE sm.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('getTransactionById error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/warehouse-transactions/warehouse/:warehouse_id - Get transactions by warehouse
const getTransactionsByWarehouse = async (req, res) => {
    try {
        const { warehouse_id } = req.params;
        const { movement_type, start_date, end_date, limit = 100 } = req.query;

        const conditions = ['sm.warehouse_id = $1'];
        const values = [parseInt(warehouse_id)];
        let i = 2;

        if (movement_type) {
            conditions.push(`sm.movement_type = $${i++}`);
            values.push(movement_type);
        }
        if (start_date) {
            conditions.push(`sm.created_at >= $${i++}`);
            values.push(new Date(start_date));
        }
        if (end_date) {
            conditions.push(`sm.created_at <= $${i++}`);
            values.push(new Date(end_date));
        }

        const result = await pool.query(
            `SELECT 
                sm.*,
                p.name AS product_name,
                p.sku,
                w.name AS warehouse_name,
                u.name AS performed_by_name
             FROM stock_movements sm
             JOIN products p ON sm.product_id = p.id
             JOIN warehouses w ON sm.warehouse_id = w.id
             LEFT JOIN users u ON sm.performed_by = u.id
             WHERE ${conditions.join(' AND ')}
             ORDER BY sm.created_at DESC
             LIMIT $${i++}`,
            [...values, parseInt(limit)]
        );

        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error('getTransactionsByWarehouse error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/warehouse-transactions/product/:product_id - Get transactions by product
const getTransactionsByProduct = async (req, res) => {
    try {
        const { product_id } = req.params;
        const { warehouse_id, movement_type, limit = 100 } = req.query;

        const conditions = ['sm.product_id = $1'];
        const values = [parseInt(product_id)];
        let i = 2;

        if (warehouse_id) {
            conditions.push(`sm.warehouse_id = $${i++}`);
            values.push(parseInt(warehouse_id));
        }
        if (movement_type) {
            conditions.push(`sm.movement_type = $${i++}`);
            values.push(movement_type);
        }

        const result = await pool.query(
            `SELECT 
                sm.*,
                p.name AS product_name,
                p.sku,
                w.name AS warehouse_name,
                u.name AS performed_by_name
             FROM stock_movements sm
             JOIN products p ON sm.product_id = p.id
             JOIN warehouses w ON sm.warehouse_id = w.id
             LEFT JOIN users u ON sm.performed_by = u.id
             WHERE ${conditions.join(' AND ')}
             ORDER BY sm.created_at DESC
             LIMIT $${i++}`,
            [...values, parseInt(limit)]
        );

        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error('getTransactionsByProduct error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/warehouse-transactions/stats - Get transaction statistics
const getTransactionStats = async (req, res) => {
    try {
        const { warehouse_id, period = '7d' } = req.query;

        let dateFilter;
        switch (period) {
            case '24h':
                dateFilter = 'sm.created_at >= NOW() - INTERVAL \'24 hours\'';
                break;
            case '30d':
                dateFilter = 'sm.created_at >= NOW() - INTERVAL \'30 days\'';
                break;
            case '90d':
                dateFilter = 'sm.created_at >= NOW() - INTERVAL \'90 days\'';
                break;
            default:
                dateFilter = 'sm.created_at >= NOW() - INTERVAL \'7 days\'';
        }

        const conditions = [dateFilter];
        const values = [];
        let i = 1;

        if (warehouse_id) {
            conditions.push(`sm.warehouse_id = $${i++}`);
            values.push(parseInt(warehouse_id));
        }

        const stats = await pool.query(
            `SELECT 
                COUNT(*) as total_transactions,
                COUNT(*) FILTER (WHERE movement_type = 'received') as received_count,
                COUNT(*) FILTER (WHERE movement_type = 'sold') as sold_count,
                COUNT(*) FILTER (WHERE movement_type = 'transferred') as transferred_count,
                COUNT(*) FILTER (WHERE movement_type = 'adjusted') as adjusted_count,
                COUNT(*) FILTER (WHERE movement_type = 'returned') as returned_count,
                SUM(quantity_change) FILTER (WHERE quantity_change > 0) as total_incoming,
                ABS(SUM(quantity_change) FILTER (WHERE quantity_change < 0)) as total_outgoing,
                SUM(quantity_change) as net_change
             FROM stock_movements sm
             WHERE ${conditions.join(' AND ')}`,
            values
        );

        // Get recent activity summary
        const recentActivity = await pool.query(
            `SELECT 
                DATE_TRUNC('day', sm.created_at) as activity_date,
                COUNT(*) as transaction_count,
                SUM(quantity_change) as daily_change
             FROM stock_movements sm
             WHERE ${conditions.join(' AND ')}
             GROUP BY DATE_TRUNC('day', sm.created_at)
             ORDER BY activity_date DESC
             LIMIT 14`,
            values
        );

        res.json({ 
            success: true, 
            data: { 
                summary: stats.rows[0],
                recent_activity: recentActivity.rows 
            } 
        });
    } catch (err) {
        console.error('getTransactionStats error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/warehouse-transactions/movement-types - Get movement type breakdown
const getMovementTypeBreakdown = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                movement_type,
                COUNT(*) as count,
                SUM(quantity_change) as total_quantity_change,
                MAX(created_at) as last_movement
             FROM stock_movements
             GROUP BY movement_type
             ORDER BY count DESC
        `);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('getMovementTypeBreakdown error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getAllTransactions,
    getTransactionById,
    getTransactionsByWarehouse,
    getTransactionsByProduct,
    getTransactionStats,
    getMovementTypeBreakdown
};