const { PaymentTerm } = require('../models/PaymentTerm');
const { DeliveryType } = require('../models/DeliveryType');
const { OrderStatus } = require('../models/OrderStatus');
const { PaymentStatus } = require('../models/PaymentStatus');
const { UserRole } = require('../models/UserRole');
const { ShippingMethod } = require('../models/ShippingMethod');

const dropdownController = {
    async getAllDropdowns(req, res) {
        try {
            const [paymentTerms, deliveryTypes, orderStatuses, paymentStatuses, userRoles, shippingMethods] = await Promise.all([
                PaymentTerm.findAll(),
                DeliveryType.findAll(),
                OrderStatus.findAll(),
                PaymentStatus.findAll(),
                UserRole.findAll(),
                ShippingMethod.findAll()
            ]);

            res.status(200).json({
                success: true,
                data: {
                    payment_terms: paymentTerms.map(t => t.toJSON()),
                    delivery_types: deliveryTypes.map(t => t.toJSON()),
                    order_statuses: orderStatuses.map(t => t.toJSON()),
                    payment_statuses: paymentStatuses.map(t => t.toJSON()),
                    user_roles: userRoles.map(t => t.toJSON()),
                    shipping_methods: shippingMethods.map(t => t.toJSON())
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getPaymentTerms(req, res) {
        try {
            const terms = await PaymentTerm.findAll();
            res.status(200).json({ success: true, data: terms.map(t => t.toJSON()) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getDeliveryTypes(req, res) {
        try {
            const types = await DeliveryType.findAll();
            res.status(200).json({ success: true, data: types.map(t => t.toJSON()) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getOrderStatuses(req, res) {
        try {
            const statuses = await OrderStatus.findAll();
            res.status(200).json({ success: true, data: statuses.map(s => s.toJSON()) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getPaymentStatuses(req, res) {
        try {
            const statuses = await PaymentStatus.findAll();
            res.status(200).json({ success: true, data: statuses.map(s => s.toJSON()) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getUserRoles(req, res) {
        try {
            const roles = await UserRole.findAll();
            res.status(200).json({ success: true, data: roles.map(r => r.toJSON()) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getShippingMethods(req, res) {
        try {
            const methods = await ShippingMethod.findAll();
            res.status(200).json({ success: true, data: methods.map(m => m.toJSON()) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = dropdownController;