// backend/src/controllers/orderController.js
const { SalesOrder } = require('../models/SalesOrder');
const { SupplyOrder } = require('../models/SupplyOrder');

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
    }
};

module.exports = orderController;