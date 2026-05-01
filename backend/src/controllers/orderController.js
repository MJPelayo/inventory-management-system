// backend/src/controllers/orderController.js
const { SalesOrder } = require('../models/SalesOrder');
const { SupplyOrder } = require('../models/SupplyOrder');
const pool = require('../db/pool');

const orderController = {
    // ============ SALES ORDERS ============
    
    async createSalesOrder(req, res) {
        try {
            const { customer_name, customer_email, customer_phone, shipping_address, delivery_type, items } = req.body;
            const userId = req.user?.id || 1;
            
            const order = new SalesOrder({
                customer_name,
                customer_email,
                customer_phone,
                shipping_address,
                delivery_type,
                items,
                created_by: userId
            });
            
            await order.reserveStock();
            const saved = await order.save();
            
            res.status(201).json({
                success: true,
                data: saved.toJSON(),
                message: 'Order created successfully'
            });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },

    async getSalesOrders(req, res) {
        try {
            const { status, customer_name } = req.query;
            const orders = await SalesOrder.findAll({ status, customer_name });
            res.status(200).json({
                success: true,
                data: orders.map(o => o.toJSON()),
                count: orders.length
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getSalesOrderById(req, res) {
        try {
            const order = await SalesOrder.findById(parseInt(req.params.id));
            if (!order) {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }
            res.status(200).json({ success: true, data: order.toJSON() });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async updateOrderStatus(req, res) {
        try {
            const order = await SalesOrder.findById(parseInt(req.params.id));
            if (!order) {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }
            
            const { status } = req.body;
            order.updateStatus(status);
            
            res.status(200).json({
                success: true,
                message: `Order status updated to ${status}`
            });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },

    // ============ DISCOUNT APPROVAL ============
    
    async requestDiscountApproval(req, res) {
        try {
            const orderId = parseInt(req.params.id);
            const { requested_discount, reason } = req.body;
            const userId = req.user.id;
            
            const order = await SalesOrder.findById(orderId);
            if (!order) {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }
            
            // Check if discount already approved
            const existing = await pool.query(
                'SELECT * FROM discount_approvals WHERE order_id = $1 AND approved = false',
                [orderId]
            );
            
            if (existing.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'A discount request is already pending for this order'
                });
            }
            
            // Create discount approval request
            await pool.query(`
                INSERT INTO discount_approvals (order_id, requested_by, requested_discount, reason)
                VALUES ($1, $2, $3, $4)
            `, [orderId, userId, requested_discount, reason]);
            
            // Get admin users to notify (in real app, send email)
            const admins = await pool.query('SELECT email FROM users WHERE role = $1', ['admin']);
            
            res.status(200).json({
                success: true,
                message: `Discount request of ${requested_discount}% submitted for approval`,
                admins_notified: admins.rows.map(a => a.email)
            });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },

    async approveDiscount(req, res) {
        try {
            const orderId = parseInt(req.params.id);
            const { approve } = req.body; // true or false
            const adminId = req.user.id;
            
            // Get the pending request
            const request = await pool.query(
                `SELECT * FROM discount_approvals
                 WHERE order_id = $1 AND approved = false`,
                [orderId]
            );
            
            if (request.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'No pending discount request found for this order'
                });
            }
            
            if (approve) {
                // Update the order with approved discount
                await pool.query(`
                    UPDATE sales_orders
                    SET discount_amount = $1,
                        discount_approved_by = $2,
                        total_amount = subtotal - $1 + tax + shipping_cost
                    WHERE id = $3
                `, [request.rows[0].requested_discount, adminId, orderId]);
                
                // Update approval record
                await pool.query(`
                    UPDATE discount_approvals
                    SET approved = true, approved_by = $1, approval_date = CURRENT_TIMESTAMP
                    WHERE order_id = $2
                `, [adminId, orderId]);
                
                res.status(200).json({
                    success: true,
                    message: `Discount of ${request.rows[0].requested_discount}% approved`
                });
            } else {
                // Reject the request
                await pool.query(`
                    DELETE FROM discount_approvals WHERE order_id = $1
                `, [orderId]);
                
                res.status(200).json({
                    success: true,
                    message: 'Discount request rejected'
                });
            }
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },

    // ============ SUPPLY ORDERS ============
    
    async createSupplyOrder(req, res) {
        try {
            const { supplier_id, expected_delivery, items, subtotal, shipping_cost } = req.body;
            const userId = req.user?.id || 1;
            
            const order = new SupplyOrder({
                supplier_id,
                expected_delivery,
                items,
                subtotal,
                shipping_cost,
                created_by: userId
            });
            
            order.calculateTotal();
            const saved = await order.save();
            
            res.status(201).json({
                success: true,
                data: saved.toJSON(),
                message: 'Purchase order created successfully'
            });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },

    async getSupplyOrders(req, res) {
        try {
            const orders = await SupplyOrder.findAll();
            res.status(200).json({
                success: true,
                data: orders.map(o => o.toJSON()),
                count: orders.length
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getSupplyOrderById(req, res) {
        try {
            const order = await SupplyOrder.findById(parseInt(req.params.id));
            if (!order) {
                return res.status(404).json({ success: false, error: 'Purchase order not found' });
            }
            res.status(200).json({ success: true, data: order.toJSON() });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async receiveSupplyOrder(req, res) {
        try {
            const order = await SupplyOrder.findById(parseInt(req.params.id));
            if (!order) {
                return res.status(404).json({ success: false, error: 'Purchase order not found' });
            }
            
            const { warehouse_id } = req.body;
            const userId = req.user?.id || 1;
            await order.receiveStock(warehouse_id, userId);
            
            res.status(200).json({
                success: true,
                message: 'Purchase order received and stock updated'
            });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },

    async cancelSupplyOrder(req, res) {
        try {
            const order = await SupplyOrder.findById(parseInt(req.params.id));
            if (!order) {
                return res.status(404).json({ success: false, error: 'Purchase order not found' });
            }
            order.status = 'cancelled';
            await order.save();
            res.status(200).json({ success: true, message: 'Purchase order cancelled' });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
};

module.exports = orderController;