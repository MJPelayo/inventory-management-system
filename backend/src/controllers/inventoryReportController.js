const pool = require('../db/pool');

const inventoryReportController = {
    /**
     * Generate detailed inventory report
     * GET /api/reports/inventory
     */
    async getInventoryReport(req, res) {
        try {
            const { warehouse_id } = req.query;
            
            // Get warehouse summary
            let warehouseQuery = `
                SELECT 
                    w.id as warehouse_id,
                    w.name as warehouse_name,
                    w.location,
                    w.capacity,
                    COALESCE(SUM(i.quantity), 0) as total_units,
                    COUNT(DISTINCT i.product_id) as unique_products,
                    COALESCE(SUM(i.quantity * p.price), 0) as total_value,
                    COALESCE(SUM(i.quantity * p.cost), 0) as total_cost
                FROM warehouses w
                LEFT JOIN inventory i ON i.warehouse_id = w.id
                LEFT JOIN products p ON i.product_id = p.id AND p.is_active = true
                WHERE w.is_active = true
            `;
            
            const params = [];
            if (warehouse_id) {
                warehouseQuery += ` AND w.id = $1`;
                params.push(warehouse_id);
            }
            warehouseQuery += ` GROUP BY w.id, w.name, w.location, w.capacity ORDER BY w.name`;
            
            const warehouseResult = await pool.query(warehouseQuery, params);
            
            // Get low stock items across all warehouses
            const lowStockQuery = `
                SELECT 
                    p.id,
                    p.name,
                    p.sku,
                    i.quantity,
                    i.reorder_point,
                    w.name as warehouse_name,
                    w.id as warehouse_id,
                    p.price,
                    CASE 
                        WHEN i.quantity = 0 THEN 'Out of Stock'
                        WHEN i.quantity <= i.reorder_point THEN 'Low Stock'
                        ELSE 'In Stock'
                    END as stock_status
                FROM inventory i
                JOIN products p ON i.product_id = p.id
                JOIN warehouses w ON i.warehouse_id = w.id
                WHERE i.quantity <= i.reorder_point AND p.is_active = true
                ORDER BY (i.quantity::float / NULLIF(i.reorder_point, 1)) ASC
                LIMIT 50
            `;
            
            const lowStockResult = await pool.query(lowStockQuery);
            
            // Get inventory value by category
            const categoryQuery = `
                SELECT 
                    COALESCE(c.name, 'Uncategorized') as category,
                    COUNT(DISTINCT p.id) as product_count,
                    SUM(i.quantity) as total_units,
                    COALESCE(SUM(i.quantity * p.price), 0) as inventory_value
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN inventory i ON i.product_id = p.id
                WHERE p.is_active = true
                GROUP BY c.id, c.name
                ORDER BY inventory_value DESC
            `;
            
            const categoryResult = await pool.query(categoryQuery);
            
            // Calculate totals
            const totals = {
                total_warehouses: warehouseResult.rows.length,
                total_products: await getTotalProducts(),
                total_units: warehouseResult.rows.reduce((sum, w) => sum + parseInt(w.total_units || 0), 0),
                total_value: warehouseResult.rows.reduce((sum, w) => sum + parseFloat(w.total_value || 0), 0),
                total_cost: warehouseResult.rows.reduce((sum, w) => sum + parseFloat(w.total_cost || 0), 0),
                potential_profit: warehouseResult.rows.reduce((sum, w) => sum + (parseFloat(w.total_value || 0) - parseFloat(w.total_cost || 0)), 0)
            };
            
            res.status(200).json({
                success: true,
                data: {
                    warehouse_summary: warehouseResult.rows,
                    low_stock_items: lowStockResult.rows,
                    category_breakdown: categoryResult.rows,
                    totals,
                    generated_at: new Date().toISOString()
                }
            });
            
        } catch (error) {
            console.error('Inventory report error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * Export inventory report as CSV
     * GET /api/reports/inventory/export
     */
    async exportInventoryReport(req, res) {
        try {
            const query = `
                SELECT 
                    p.name as product_name,
                    p.sku,
                    p.price,
                    w.name as warehouse,
                    i.quantity,
                    i.reorder_point,
                    CASE 
                        WHEN i.quantity = 0 THEN 'Out of Stock'
                        WHEN i.quantity <= i.reorder_point THEN 'Low Stock'
                        ELSE 'In Stock'
                    END as status
                FROM inventory i
                JOIN products p ON i.product_id = p.id
                JOIN warehouses w ON i.warehouse_id = w.id
                WHERE p.is_active = true
                ORDER BY w.name, p.name
            `;
            
            const result = await pool.query(query);
            
            // Create CSV
            const headers = ['Product Name', 'SKU', 'Price', 'Warehouse', 'Quantity', 'Reorder Point', 'Status'];
            const rows = result.rows.map(row => [
                row.product_name,
                row.sku,
                row.price,
                row.warehouse,
                row.quantity,
                row.reorder_point,
                row.status
            ]);
            
            const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=inventory-report-${Date.now()}.csv`);
            res.send(csvContent);
            
        } catch (error) {
            console.error('Export inventory report error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

async function getTotalProducts() {
    const pool = require('../db/pool');
    const result = await pool.query('SELECT COUNT(*) as count FROM products WHERE is_active = true');
    return parseInt(result.rows[0].count);
}

module.exports = inventoryReportController;