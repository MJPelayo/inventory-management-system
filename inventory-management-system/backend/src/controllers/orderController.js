// backend/src/controllers/orderController.js
const pool = require('../db/pool');

const orderController = {
    // Get all orders with optional filters
    async getAllOrders(req, res) {
        try {
            const { status, payment_status, page = 1, limit = 50 } = req.query;
            
            let query = `
                SELECT 
                    so.*,
                    u.name as created_by_name
                FROM sales_orders so
                LEFT JOIN users u ON so.created_by = u.id
                WHERE 1=1
            `;
            const params = [];
            let paramIndex = 1;

            if (status && status !== 'all') {
                query += ` AND so.status = $${paramIndex++}`;
                params.push(status);
            }

            if (payment_status && payment_status !== 'all') {
                query += ` AND so.payment_status = $${paramIndex++}`;
                params.push(payment_status);
            }

            query += ` ORDER BY so.created_at DESC`;

            if (limit && limit !== 'all') {
                const offset = (parseInt(page) - 1) * parseInt(limit);
                query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
                params.push(parseInt(limit), offset);
            }

            const result = await pool.query(query, params);
            
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Get orders error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch orders',
                message: error.message
            });
        }
    },

    // Get single order by ID
    async getOrderById(req, res) {
        try {
            const { id } = req.params;
            
            const orderResult = await pool.query(
                `SELECT so.*, u.name as created_by_name 
                 FROM sales_orders so 
                 LEFT JOIN users u ON so.created_by = u.id 
                 WHERE so.id = $1`,
                [id]
            );

            if (orderResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }

            // Get order items
            const itemsResult = await pool.query(
                `SELECT oi.*, p.name as product_name, p.sku as product_sku 
                 FROM order_items oi 
                 LEFT JOIN products p ON oi.product_id = p.id 
                 WHERE oi.order_id = $1 AND oi.order_type = 'sales'`,
                [id]
            );

            res.json({
                success: true,
                data: {
                    ...orderResult.rows[0],
                    items: itemsResult.rows
                }
            });
        } catch (error) {
            console.error('Get order error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch order',
                message: error.message
            });
        }
    },

    // Create new order
    async createOrder(req, res) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const {
                customer_name,
                customer_email,
                customer_phone,
                shipping_address,
                delivery_type,
                shipping_cost,
                items
            } = req.body;

            // Validate required fields
            if (!customer_name || !items || items.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    error: 'Customer name and at least one item are required'
                });
            }

            // Generate order number
            const orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase();

            // Calculate totals
            let subtotal = 0;
            for (const item of items) {
                const itemTotal = item.unit_price * item.quantity * (1 - (item.discount || 0) / 100);
                subtotal += itemTotal;
            }

            const tax = subtotal * 0.10; // 10% tax
            const totalAmount = subtotal + tax + (parseFloat(shipping_cost) || 0);

            // Create order
            const orderResult = await client.query(
                `INSERT INTO sales_orders 
                 (order_number, customer_name, customer_email, customer_phone, shipping_address, 
                  delivery_type, status, payment_status, subtotal, tax, shipping_cost, total_amount, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                 RETURNING *`,
                [
                    orderNumber,
                    customer_name,
                    customer_email || null,
                    customer_phone || null,
                    shipping_address || null,
                    delivery_type || 'delivery',
                    'pending',
                    'pending',
                    subtotal,
                    tax,
                    parseFloat(shipping_cost) || 0,
                    totalAmount,
                    req.user ? req.user.id : null
                ]
            );

            const orderId = orderResult.rows[0].id;

            // Create order items
            for (const item of items) {
                const discountAmount = item.unit_price * item.quantity * ((item.discount || 0) / 100);
                
                await client.query(
                    `INSERT INTO order_items 
                     (order_id, order_type, product_id, product_name, quantity, unit_price, discount)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        orderId,
                        'sales',
                        item.product_id,
                        item.product_name || null,
                        item.quantity,
                        item.unit_price,
                        item.discount || 0
                    ]
                );

                // Update inventory (decrease stock)
                await client.query(
                    `UPDATE inventory 
                     SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
                     WHERE product_id = $2 AND quantity >= $1`,
                    [item.quantity, item.product_id]
                );

                // Record stock movement
                await client.query(
                    `INSERT INTO stock_movements 
                     (product_id, warehouse_id, quantity_change, movement_type, reason, performed_by)
                     SELECT $1, w.id, -$2, 'sold', 'Order ${orderNumber}', $3
                     FROM warehouses w WHERE w.is_active = true LIMIT 1`,
                    [item.product_id, item.quantity, req.user ? req.user.id : null]
                );
            }

            await client.query('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: orderResult.rows[0]
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Create order error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create order',
                message: error.message
            });
        } finally {
            client.release();
        }
    },

    // Update order status
    async updateOrderStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const validStatuses = ['pending', 'processing', 'ready', 'in_transit', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
                });
            }

            const result = await pool.query(
                `UPDATE sales_orders 
                 SET status = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2
                 RETURNING *`,
                [status, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }

            res.json({
                success: true,
                message: 'Order status updated',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Update order status error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update order status',
                message: error.message
            });
        }
    },

    // Update payment status
    async updatePaymentStatus(req, res) {
        try {
            const { id } = req.params;
            const { payment_status } = req.body;

            const validPayments = ['pending', 'paid', 'failed', 'refunded'];
            if (!validPayments.includes(payment_status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid payment status'
                });
            }

            const result = await pool.query(
                `UPDATE sales_orders 
                 SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2
                 RETURNING *`,
                [payment_status, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }

            res.json({
                success: true,
                message: 'Payment status updated',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Update payment status error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update payment status',
                message: error.message
            });
        }
    },

    // Get order statistics
    async getOrderStats(req, res) {
        try {
            const statsResult = await pool.query(`
                SELECT 
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
                    SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                    COALESCE(SUM(total_amount), 0) as total_revenue,
                    COALESCE(AVG(total_amount), 0) as avg_order_value
                FROM sales_orders
            `);

            res.json({
                success: true,
                data: statsResult.rows[0]
            });
        } catch (error) {
            console.error('Get order stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch order statistics',
                message: error.message
            });
        }
    }
};

module.exports = orderController;