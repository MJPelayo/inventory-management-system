// backend/src/controllers/supplierController.js
const { Supplier } = require('../models/Supplier');

const supplierController = {
    async getAllSuppliers(req, res) {
        try {
            const { is_active, search } = req.query;
            const suppliers = await Supplier.findAll({ 
                is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
                search
            });
            res.status(200).json({
                success: true,
                data: suppliers.map(s => s.toJSON()),
                count: suppliers.length
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getSupplierById(req, res) {
        try {
            const supplier = await Supplier.findById(parseInt(req.params.id));
            if (!supplier) {
                return res.status(404).json({ success: false, error: 'Supplier not found' });
            }
            res.status(200).json({ success: true, data: supplier.toJSON() });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async createSupplier(req, res) {
        try {
            const { name, contact_person, phone, email, address, tax_id, payment_terms, lead_time_days, minimum_order } = req.body;
            
            if (!name) {
                return res.status(400).json({ success: false, error: 'Supplier name is required' });
            }
            
            const supplier = new Supplier({
                name, contact_person, phone, email, address, tax_id, payment_terms, lead_time_days, minimum_order
            });
            
            const saved = await supplier.save();
            res.status(201).json({ success: true, data: saved.toJSON() });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },

    async updateSupplier(req, res) {
        try {
            const supplier = await Supplier.findById(parseInt(req.params.id));
            if (!supplier) {
                return res.status(404).json({ success: false, error: 'Supplier not found' });
            }
            
            const { name, contact_person, phone, email, address, payment_terms, lead_time_days, minimum_order, is_active } = req.body;
            
            if (name) supplier.name = name;
            if (contact_person !== undefined) supplier.contact_person = contact_person;
            if (phone !== undefined) supplier.phone = phone;
            if (email !== undefined) supplier.email = email;
            if (address !== undefined) supplier.address = address;
            if (payment_terms !== undefined) supplier.payment_terms = payment_terms;
            if (lead_time_days !== undefined) supplier.lead_time_days = lead_time_days;
            if (minimum_order !== undefined) supplier.minimum_order = minimum_order;
            if (is_active !== undefined) supplier.is_active = is_active;
            
            const updated = await supplier.save();
            res.status(200).json({ success: true, data: updated.toJSON() });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },

    async deleteSupplier(req, res) {
        try {
            const deleted = await Supplier.deleteById(parseInt(req.params.id));
            if (!deleted) {
                return res.status(404).json({ success: false, error: 'Supplier not found' });
            }
            res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = supplierController;