/**
 * Report Controller
 * Generates various business reports (Sales, Inventory, Supplier)
 * 
 * @module controllers/reportController
 */

const pool = require('../db/pool');
const PDFDocument = require('pdfkit');

const reportController = {
    /**
     * Generate Sales Report
     * GET /api/reports/sales
     * 
     * Query params:
     * - start_date: ISO date string
     * - end_date: ISO date string  
     * - format: 'json' or 'pdf'
     */
    async getSalesReport(req, res) {
        try {
            const { start_date, end_date, format = 'json' } = req.query;
            
            let query = `
                SELECT 
                    DATE(so.created_at) as date,
                    COUNT(so.id) as order_count,
                    SUM(so.total_amount) as total_sales,
                    AVG(so.total_amount) as avg_order_value,
                    SUM(so.discount_amount) as total_discounts,
                    COUNT(DISTINCT so.customer_name) as unique_customers
                FROM sales_orders so
                WHERE so.status != 'cancelled'
            `;
            
            const params = [];
            let paramCount = 1;
            
            if (start_date && end_date) {
                query += ` AND so.created_at BETWEEN $${paramCount} AND $${paramCount + 1}`;
                params.push(start_date, end_date);
                paramCount += 2;
            }
            
            query += ` GROUP BY DATE(so.created_at) ORDER BY date DESC`;
            
            const result = await pool.query(query, params);
            
            // Get top selling products
            const topProductsQuery = `
                SELECT 
                    p.name,
                    p.sku,
                    SUM(oi.quantity) as total_quantity,
                    SUM(oi.quantity * oi.unit_price) as total_revenue
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_type = 'sales'
                GROUP BY p.id, p.name, p.sku
                ORDER BY total_revenue DESC
                LIMIT 10
            `;
            const topProducts = await pool.query(topProductsQuery);
            
            // Get sales by category
            const categorySalesQuery = `
                SELECT 
                    c.name as category,
                    SUM(oi.quantity * oi.unit_price) as revenue
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE oi.order_type = 'sales'
                GROUP BY c.id, c.name
                ORDER BY revenue DESC
            `;
            const categorySales = await pool.query(categorySalesQuery);
            
            const reportData = {
                summary: {
                    total_orders: result.rows.reduce((sum, r) => sum + parseInt(r.order_count), 0),
                    total_sales: parseFloat(result.rows.reduce((sum, r) => sum + parseFloat(r.total_sales), 0).toFixed(2)),
                    average_order_value: result.rows.length > 0 ? 
                        parseFloat((result.rows.reduce((sum, r) => sum + parseFloat(r.avg_order_value), 0) / result.rows.length).toFixed(2)) : 0,
                    total_discounts: parseFloat(result.rows.reduce((sum, r) => sum + parseFloat(r.total_discounts || 0), 0).toFixed(2)),
                    date_range: { start_date, end_date }
                },
                daily_breakdown: result.rows,
                top_products: topProducts.rows,
                category_breakdown: categorySales.rows
            };
            
            // Handle PDF export
            if (format === 'pdf') {
                return await reportController._exportSalesPDF(reportData, res);
            }
            
            res.status(200).json({
                success: true,
                data: reportData,
                generated_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('Sales report error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * Generate Inventory Report
     * GET /api/reports/inventory
     */
    async getInventoryReport(req, res) {
        try {
            const { warehouse_id } = req.query;
            
            let query = `
                SELECT 
                    w.name as warehouse_name,
                    w.id as warehouse_id,
                    COUNT(DISTINCT i.product_id) as unique_products,
                    SUM(i.quantity) as total_units,
                    SUM(i.quantity * p.price) as total_value,
                    SUM(i.quantity * p.cost) as total_cost,
                    COUNT(CASE WHEN i.quantity <= i.reorder_point AND i.quantity > 0 THEN 1 END) as low_stock_items,
                    COUNT(CASE WHEN i.quantity = 0 THEN 1 END) as out_of_stock_items
                FROM inventory i
                JOIN products p ON i.product_id = p.id
                JOIN warehouses w ON i.warehouse_id = w.id
                WHERE p.is_active = true
            `;
            
            const params = [];
            if (warehouse_id) {
                query += ` AND i.warehouse_id = $1`;
                params.push(warehouse_id);
            }
            
            query += ` GROUP BY w.id, w.name`;
            
            const result = await pool.query(query, params);
            
            // Get detailed low stock items
            const lowStockQuery = `
                SELECT 
                    p.name,
                    p.sku,
                    i.quantity,
                    i.reorder_point,
                    w.name as warehouse,
                    ROUND((i.quantity::float / NULLIF(i.reorder_point, 1)) * 100, 2) as stock_percentage
                FROM inventory i
                JOIN products p ON i.product_id = p.id
                JOIN warehouses w ON i.warehouse_id = w.id
                WHERE i.quantity <= i.reorder_point AND i.quantity > 0
                ORDER BY stock_percentage ASC
                LIMIT 20
            `;
            const lowStock = await pool.query(lowStockQuery);
            
            // Calculate total across all warehouses
            const totals = {
                total_inventory_value: result.rows.reduce((sum, r) => sum + parseFloat(r.total_value), 0),
                total_inventory_cost: result.rows.reduce((sum, r) => sum + parseFloat(r.total_cost), 0),
                total_units: result.rows.reduce((sum, r) => sum + parseInt(r.total_units), 0),
                potential_profit: result.rows.reduce((sum, r) => sum + (parseFloat(r.total_value) - parseFloat(r.total_cost)), 0)
            };
            
            res.status(200).json({
                success: true,
                data: {
                    warehouse_summary: result.rows,
                    low_stock_items: lowStock.rows,
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
     * Generate Supplier Report
     * GET /api/reports/suppliers
     */
    async getSupplierReport(req, res) {
        try {
            const query = `
                SELECT
                    s.id,
                    s.name,
                    s.contact_person,
                    s.phone,
                    s.email,
                    s.lead_time_days,
                    COUNT(DISTINCT p.id) as products_supplied
                FROM suppliers s
                LEFT JOIN products p ON p.supplier_id = s.id
                WHERE s.is_active = true
                GROUP BY s.id, s.name, s.contact_person, s.phone, s.email, s.lead_time_days
                ORDER BY s.name ASC
            `;
            
            const result = await pool.query(query);
            
            res.status(200).json({
                success: true,
                data: {
                    suppliers: result.rows,
                    total_suppliers: result.rows.length,
                    generated_at: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Supplier report error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * Private method: Export sales report as PDF
     */
    async _exportSalesPDF(data, res) {
        const doc = new PDFDocument({ margin: 50 });
        const filename = `sales-report-${Date.now()}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
        doc.pipe(res);
        
        // Header
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text('Sales Report', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();
        
        // Summary Section
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('Summary', { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(11)
           .font('Helvetica')
           .text(`Total Orders: ${data.summary.total_orders}`)
           .text(`Total Sales: $${data.summary.total_sales.toFixed(2)}`)
           .text(`Average Order Value: $${data.summary.average_order_value.toFixed(2)}`)
           .text(`Total Discounts: $${data.summary.total_discounts.toFixed(2)}`);
        doc.moveDown();
        
        // Top Products Section
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('Top 10 Products', { underline: true });
        doc.moveDown(0.5);
        
        data.top_products.forEach((product, index) => {
            doc.fontSize(10)
               .font('Helvetica')
               .text(`${index + 1}. ${product.name} (${product.sku})`);
            doc.text(`   Quantity Sold: ${product.total_quantity} units`, { indent: 20 });
            doc.text(`   Revenue: $${parseFloat(product.total_revenue).toFixed(2)}`, { indent: 20 });
            doc.moveDown(0.3);
        });
        
        doc.end();
    }
};

module.exports = reportController;