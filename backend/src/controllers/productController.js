// backend/src/controllers/productController.js
const { Product } = require('../models/Product');
const { Inventory } = require('../models/Inventory');

const productController = {
    // Get all products
    async getAllProducts(req, res) {
        try {
            const { category_id, supplier_id, is_active, search } = req.query;
            const products = await Product.findAll({ 
                category_id: category_id ? parseInt(category_id) : undefined,
                supplier_id: supplier_id ? parseInt(supplier_id) : undefined,
                is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
                search
            });
            res.status(200).json({
                success: true,
                data: products.map(p => p.toJSON()),
                count: products.length
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Get product by ID
    async getProductById(req, res) {
        try {
            const product = await Product.findById(parseInt(req.params.id));
            if (!product) {
                return res.status(404).json({ success: false, error: 'Product not found' });
            }
            
            const inventory = await product.getInventory();
            const productData = product.toJSON();
            productData.inventory = inventory;
            
            res.status(200).json({ success: true, data: productData });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Create new product
    async createProduct(req, res) {
        try {
            const { name, sku, price, cost, category_id, supplier_id, brand, description } = req.body;
            
            const existing = await Product.findBySku(sku);
            if (existing) {
                return res.status(400).json({ success: false, error: 'SKU already exists' });
            }
            
            const product = new Product({
                name, sku, price, cost, category_id, supplier_id, brand, description
            });
            
            const saved = await product.save();
            res.status(201).json({ success: true, data: saved.toJSON() });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },

    // Update product
    async updateProduct(req, res) {
        try {
            const product = await Product.findById(parseInt(req.params.id));
            if (!product) {
                return res.status(404).json({ success: false, error: 'Product not found' });
            }
            
            const { name, price, cost, category_id, supplier_id, brand, is_active } = req.body;
            if (name) product.setName(name);
            if (price) product.setPrice(price);
            if (cost) product.setCost(cost);
            if (category_id !== undefined) product.category_id = category_id;
            if (supplier_id !== undefined) product.supplier_id = supplier_id;
            if (brand !== undefined) product.brand = brand;
            if (is_active !== undefined) product.is_active = is_active;
            
            const updated = await product.save();
            res.status(200).json({ success: true, data: updated.toJSON() });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },

    // Delete product
    async deleteProduct(req, res) {
        try {
            const deleted = await Product.deleteById(parseInt(req.params.id));
            if (!deleted) {
                return res.status(404).json({ success: false, error: 'Product not found' });
            }
            res.status(200).json({ success: true, message: 'Product deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Get low stock products
    async getLowStockProducts(req, res) {
        try {
            const lowStock = await Inventory.getLowStock();
            res.status(200).json({
                success: true,
                data: lowStock.map(i => i.toJSON()),
                count: lowStock.length
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = productController;