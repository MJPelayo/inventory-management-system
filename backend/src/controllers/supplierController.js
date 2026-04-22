// backend/src/controllers/supplierController.js
const { Supplier } = require('../models/Supplier');

const supplierController = {
	// Get all suppliers
	async getAllSuppliers(req, res) {
		try {
			const filters = {};
			if (req.query.search) filters.search = req.query.search;
			if (req.query.is_active) filters.is_active = req.query.is_active === 'true';

			const suppliers = await Supplier.findAll(filters);
			res.status(200).json({
				success: true,
				data: suppliers.map(s => s.toJSON()),
				count: suppliers.length,
				message: 'Suppliers retrieved successfully'
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: error.message,
				message: 'Failed to retrieve suppliers'
			});
		}
	},

	// Get supplier by ID
	async getSupplierById(req, res) {
		try {
			const id = parseInt(req.params.id);
			if (isNaN(id)) {
				return res.status(400).json({
					success: false,
					error: 'Invalid supplier ID'
				});
			}

			const supplier = await Supplier.findById(id);
			if (!supplier) {
				return res.status(404).json({
					success: false,
					error: 'Supplier not found'
				});
			}

			res.status(200).json({
				success: true,
				data: supplier.toJSON(),
				message: 'Supplier retrieved successfully'
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: error.message,
				message: 'Failed to retrieve supplier'
			});
		}
	},

	// Create new supplier
	async createSupplier(req, res) {
		try {
			const {
				name,
				contact_person,
				phone,
				email,
				address,
				tax_id,
				payment_terms,
				lead_time_days,
				minimum_order,
				rating,
				total_orders,
				on_time_deliveries,
				is_active
			} = req.body;

			if (!name || !name.trim()) {
				return res.status(400).json({
					success: false,
					error: 'Name is required'
				});
			}

			if (tax_id) {
				const existing = await Supplier.findByTaxId(tax_id);
				if (existing) {
					return res.status(400).json({
						success: false,
						error: 'Tax ID already exists'
					});
				}
			}

			const supplier = new Supplier({
				name: name.trim(),
				contact_person: contact_person || null,
				phone: phone || null,
				email: email || null,
				address: address || null,
				tax_id: tax_id || null,
				payment_terms: payment_terms || null,
				lead_time_days: lead_time_days !== undefined ? Number(lead_time_days) : 7,
				minimum_order: minimum_order !== undefined ? Number(minimum_order) : 0,
				rating: rating !== undefined ? Number(rating) : 0,
				total_orders: total_orders !== undefined ? Number(total_orders) : 0,
				on_time_deliveries: on_time_deliveries !== undefined ? Number(on_time_deliveries) : 0,
				is_active: is_active !== undefined ? is_active : true
			});

			if (supplier.lead_time_days < 0) {
				return res.status(400).json({
					success: false,
					error: 'Lead time must be a non-negative number'
				});
			}

			if (supplier.minimum_order < 0) {
				return res.status(400).json({
					success: false,
					error: 'Minimum order must be a non-negative number'
				});
			}

			if (supplier.rating < 0 || supplier.rating > 5) {
				return res.status(400).json({
					success: false,
					error: 'Rating must be between 0 and 5'
				});
			}

			const saved = await supplier.save();
			res.status(201).json({
				success: true,
				data: saved.toJSON(),
				message: 'Supplier created successfully'
			});
		} catch (error) {
			res.status(400).json({
				success: false,
				error: error.message,
				message: 'Failed to create supplier'
			});
		}
	},

	// Update supplier
	async updateSupplier(req, res) {
		try {
			const id = parseInt(req.params.id);
			if (isNaN(id)) {
				return res.status(400).json({
					success: false,
					error: 'Invalid supplier ID'
				});
			}

			const supplier = await Supplier.findById(id);
			if (!supplier) {
				return res.status(404).json({
					success: false,
					error: 'Supplier not found'
				});
			}

			const {
				name,
				contact_person,
				phone,
				email,
				address,
				tax_id,
				payment_terms,
				lead_time_days,
				minimum_order,
				rating,
				total_orders,
				on_time_deliveries,
				is_active
			} = req.body;

			if (name !== undefined) supplier.setName(name.trim());
			if (email !== undefined) supplier.setEmail(email);
			if (contact_person !== undefined) supplier.contact_person = contact_person;
			if (phone !== undefined) supplier.phone = phone;
			if (address !== undefined) supplier.address = address;
			if (tax_id !== undefined) supplier.tax_id = tax_id;
			if (payment_terms !== undefined) supplier.payment_terms = payment_terms;
			if (lead_time_days !== undefined) supplier.setLeadTimeDays(Number(lead_time_days));
			if (minimum_order !== undefined) supplier.setMinimumOrder(Number(minimum_order));
			if (rating !== undefined) supplier.setRating(Number(rating));
			if (total_orders !== undefined) supplier.total_orders = Number(total_orders);
			if (on_time_deliveries !== undefined) supplier.on_time_deliveries = Number(on_time_deliveries);
			if (is_active !== undefined) {
				is_active ? supplier.activate() : supplier.deactivate();
			}

			if (tax_id !== undefined) {
				const existing = await Supplier.findByTaxId(tax_id);
				if (existing && existing.id !== id) {
					return res.status(400).json({
						success: false,
						error: 'Tax ID already exists'
					});
				}
			}

			const updated = await supplier.save();
			res.status(200).json({
				success: true,
				data: updated.toJSON(),
				message: 'Supplier updated successfully'
			});
		} catch (error) {
			res.status(400).json({
				success: false,
				error: error.message,
				message: 'Failed to update supplier'
			});
		}
	},

	// Delete supplier
	async deleteSupplier(req, res) {
		try {
			const id = parseInt(req.params.id);
			if (isNaN(id)) {
				return res.status(400).json({
					success: false,
					error: 'Invalid supplier ID'
				});
			}

			const deleted = await Supplier.deleteById(id);
			if (!deleted) {
				return res.status(404).json({
					success: false,
					error: 'Supplier not found'
				});
			}

			res.status(200).json({
				success: true,
				message: 'Supplier deleted successfully'
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: error.message,
				message: 'Failed to delete supplier'
			});
		}
	}
};

module.exports = supplierController;
