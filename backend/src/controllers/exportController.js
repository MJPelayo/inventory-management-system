/**
 * Export Controller
 * Handles data export to CSV and other formats (Admin only)
 * 
 * @module controllers/exportController
 */

const pool = require('../db/pool');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

// Ensure exports directory exists
const EXPORTS_DIR = path.join(__dirname, '../exports');
if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

const exportController = {
    /**
     * Export users to CSV
     * GET /api/export/users
     */
    async exportUsers(req, res) {
        try {
            const result = await pool.query(`
                SELECT 
                    id, 
                    name, 
                    email, 
                    role, 
                    department, 
                    is_active,
                    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
                FROM users
                ORDER BY name
            `);
            
            const filename = `users-export-${Date.now()}.csv`;
            const filepath = path.join(EXPORTS_DIR, filename);
            
            const csvWriter = createCsvWriter({
                path: filepath,
                header: [
                    { id: 'id', title: 'ID' },
                    { id: 'name', title: 'Name' },
                    { id: 'email', title: 'Email' },
                    { id: 'role', title: 'Role' },
                    { id: 'department', title: 'Department' },
                    { id: 'is_active', title: 'Active' },
                    { id: 'created_at', title: 'Created At' }
                ]
            });
            
            await csvWriter.writeRecords(result.rows);
            
            res.download(filepath, filename, (err) => {
                // Clean up file after download
                fs.unlinkSync(filepath);
                if (err) {
                    console.error('Download error:', err);
                }
            });
        } catch (error) {
            console.error('Export users error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * Export products to CSV
     * GET /api/export/products
     */
    async exportProducts(req, res) {
        try {
            const result = await pool.query(`
                SELECT 
                    p.id,
                    p.name,
                    p.sku,
                    p.price,
                    p.cost,
                    ROUND(((p.price - p.cost) / p.price * 100), 2) as profit_margin,
                    c.name as category,
                    s.name as supplier,
                    p.brand,
                    p.is_active
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                ORDER BY p.name
            `);
            
            const filename = `products-export-${Date.now()}.csv`;
            const filepath = path.join(EXPORTS_DIR, filename);
            
            const csvWriter = createCsvWriter({
                path: filepath,
                header: [
                    { id: 'id', title: 'ID' },
                    { id: 'name', title: 'Name' },
                    { id: 'sku', title: 'SKU' },
                    { id: 'price', title: 'Price' },
                    { id: 'cost', title: 'Cost' },
                    { id: 'profit_margin', title: 'Profit Margin %' },
                    { id: 'category', title: 'Category' },
                    { id: 'supplier', title: 'Supplier' },
                    { id: 'brand', title: 'Brand' },
                    { id: 'is_active', title: 'Active' }
                ]
            });
            
            await csvWriter.writeRecords(result.rows);
            res.download(filepath, filename, () => fs.unlinkSync(filepath));
        } catch (error) {
            console.error('Export products error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * Export inventory to CSV
     * GET /api/export/inventory
     */
    async exportInventory(req, res) {
        try {
            const result = await pool.query(`
                SELECT 
                    p.name as product_name,
                    p.sku,
                    w.name as warehouse,
                    i.quantity,
                    i.reorder_point,
                    i.max_stock,
                    CASE 
                        WHEN i.quantity <= i.reorder_point THEN 'Low Stock'
                        WHEN i.quantity >= i.max_stock THEN 'Overstock'
                        ELSE 'Optimal'
                    END as stock_status,
                    ROUND((i.quantity::float / NULLIF(i.max_stock, 1)) * 100, 2) as capacity_used
                FROM inventory i
                JOIN products p ON i.product_id = p.id
                JOIN warehouses w ON i.warehouse_id = w.id
                ORDER BY w.name, p.name
            `);
            
            const filename = `inventory-export-${Date.now()}.csv`;
            const filepath = path.join(EXPORTS_DIR, filename);
            
            const csvWriter = createCsvWriter({
                path: filepath,
                header: [
                    { id: 'product_name', title: 'Product' },
                    { id: 'sku', title: 'SKU' },
                    { id: 'warehouse', title: 'Warehouse' },
                    { id: 'quantity', title: 'Quantity' },
                    { id: 'reorder_point', title: 'Reorder Point' },
                    { id: 'max_stock', title: 'Max Stock' },
                    { id: 'stock_status', title: 'Status' },
                    { id: 'capacity_used', title: 'Capacity %' }
                ]
            });
            
            await csvWriter.writeRecords(result.rows);
            res.download(filepath, filename, () => fs.unlinkSync(filepath));
        } catch (error) {
            console.error('Export inventory error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = exportController;