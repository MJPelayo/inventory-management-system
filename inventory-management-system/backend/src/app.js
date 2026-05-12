// backend/src/app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productroutes');
const warehouseRoutes = require('./routes/Warehouseroutes');
const stockRoutes = require('./routes/stockRoutes');
const auditRoutes = require('./routes/auditRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const supplierMessageRoutes = require('./routes/supplierMessageRoutes');
const discountRoutes = require('./routes/discountRoutes');
const warehouseTransactionRoutes = require('./routes/warehouseTransactionRoutes');
const orderRoutes = require('./routes/orderRoutes');
const pool = require('./db/pool');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewarep
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Inventory Management System API is running',
        timestamp: new Date().toISOString(),
        database: process.env.DB_NAME || 'inventory_db' // Fixed: Use env var
    });
});
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Inventory Management System API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: 'GET /api/health',
            auth: 'POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me',
            users: 'GET/POST/PUT/DELETE /api/users (admin only)',
            products: 'GET/POST/PUT/DELETE /api/products',
            warehouses: 'GET/POST/PUT/DELETE /api/warehouses'
        }
    });
});

// Auth routes (public login, protected me)
app.use('/api/auth', authRoutes);

// User routes (protected - admin only)
app.use('/api/users', userRoutes);
app.use('/api/users', userRoutes);

// Product routes
app.use('/api/products', productRoutes);

// Warehouse routes
app.use('/api/warehouses', warehouseRoutes);
// Stock/Inventory routes
app.use('/api/stock', stockRoutes);

// Audit log routes
app.use('/api/audit', auditRoutes);

// Supplier routes
app.use('/api/suppliers', supplierRoutes);

// Supplier message routes (sales manager communication)
app.use('/api/supplier-messages', supplierMessageRoutes);

// Product discount routes
app.use('/api/discounts', discountRoutes);

// Warehouse transaction routes
app.use('/api/warehouse-transactions', warehouseTransactionRoutes);

// Order routes
app.use('/api/orders', orderRoutes);

// 404 handler
// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Endpoint not found',
        message: `The endpoint ${req.method} ${req.path} does not exist`
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        success: false, 
        error: err.message || 'Internal Server Error',
        message: 'Something went wrong on the server'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   INVENTORY MANAGEMENT SYSTEM API                                 ║
║   Server running on port: ${PORT}                                 ║
║   Environment: ${process.env.NODE_ENV || 'development'}           ║
║                                                                   ║
║   Auth API:              http://localhost:${PORT}/api/auth        ║
║   Users API:             http://localhost:${PORT}/api/users       ║
║   Products API:          http://localhost:${PORT}/api/products    ║
║   Warehouse API:         http://localhost:${PORT}/api/warehouses  ║
║   Stock API:             http://localhost:${PORT}/api/stock       ║
║   Supplier Messages:     http://localhost:${PORT}/api/supplier-messages ║
║   Discounts API:         http://localhost:${PORT}/api/discounts   ║
║   Warehouse Transactions:http://localhost:${PORT}/api/warehouse-transactions ║
║   Orders API:            http://localhost:${PORT}/api/orders    ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
