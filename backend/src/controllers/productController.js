// backend/src/controllers/productController.js
const { Product } = require('../models/Product');
const { Inventory } = require('../models/Inventory');
const pool = require('../db/pool');

async function getAllSubcategoryIds(categoryId, pool) {
    const subcategories = [];
    const queue = [categoryId];
    
    while (queue.length > 0) {
        const currentId = queue.shift();
        const result = await pool.query(
            'SELECT id FROM categories WHERE parent_id = $1',
            [currentId]
        );
        for (const row of result.rows) {
            subcategories.push(row.id);
            queue.push(row.id);
        }
    }
    return subcategories;
}

const productController = {
    // Get all products
    async getAllProducts(req, res) {
        try {
            const { category_id, supplier_id, is_active, search, limit, offset } = req.query;
            
            let query = `
                SELECT p.*, c.name as category_name, s.name as supplier_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 1;
            
            // ✅ All filters use parameterized queries
            if (category_id) {
                query += ` AND p.category_id = $${paramCount++}`;
                params.push(parseInt(category_id));
            }
            
            if (supplier_id) {
                query += ` AND p.supplier_id = $${paramCount++}`;
                params.push(parseInt(supplier_id));
            }
            
            if (is_active !== undefined) {
                query += ` AND p.is_active = $${paramCount++}`;
                params.push(is_active === 'true');
            }
            
            if (search) {
                query += ` AND (p.name ILIKE $${paramCount++} OR p.sku ILIKE $${paramCount++})`;
                params.push(`%${search}%`, `%${search}%`);
            }
            
            query += ' ORDER BY p.name';
            
            if (limit) {
                query += ` LIMIT $${paramCount++}`;
                params.push(parseInt(limit));
            }
            
            if (offset) {
                query += ` OFFSET $${paramCount++}`;
                params.push(parseInt(offset));
            }
            
            const result = await pool.query(query, params);
            
            res.status(200).json({
                success: true,
                data: result.rows,
                count: result.rows.length
            });
        } catch (error) {
            console.error('Failed to get products:', error);
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
    },

    // Bulk update prices
    async bulkUpdatePrices(req, res) {
        try {
            const { updates } = req.body;

            if (!updates || !Array.isArray(updates) || updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Updates array is required'
                });
            }

            const client = await pool.connect();
            const results = [];
            const errors = [];

            try {
                await client.query('BEGIN');

                for (const update of updates) {
                    const { id, price } = update;

                    if (!id || price === undefined || price < 0) {
                        errors.push({ id, error: 'Invalid price or ID' });
                        continue;
                    }

                    const product = await Product.findById(id);
                    if (!product) {
                        errors.push({ id, error: 'Product not found' });
                        continue;
                    }

                    product.setPrice(price);
                    const updated = await product.save();
                    results.push(updated.toJSON());
                }

                await client.query('COMMIT');

                res.status(200).json({
                    success: true,
                    data: {
                        updated: results,
                        failed: errors,
                        total_updated: results.length,
                        total_failed: errors.length
                    },
                    message: `Updated ${results.length} products`
                });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
};

module.exports = productController;