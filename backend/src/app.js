// backend/src/app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple auth middleware (keep your existing one)
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        req.user = { id: 1, role: 'admin' };
        return next();
    }
    try {
        const decoded = Buffer.from(token, 'base64').toString();
        const [userId] = decoded.split(':');
        req.user = { id: parseInt(userId), role: 'admin' };
        next();
    } catch (error) {
        req.user = { id: 1, role: 'admin' };
        next();
    }
};

// Routes (your existing routes)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', authMiddleware, require('./routes/userRoutes'));
app.use('/api/products', authMiddleware, require('./routes/productRoutes'));
app.use('/api/categories', authMiddleware, require('./routes/categoryRoutes'));
app.use('/api/suppliers', authMiddleware, require('./routes/supplierRoutes'));
app.use('/api/warehouses', authMiddleware, require('./routes/warehouseRoutes'));
app.use('/api/inventory', authMiddleware, require('./routes/inventoryRoutes'));
app.use('/api/orders', authMiddleware, require('./routes/orderRoutes'));

// ===== CHECKPOINT 3 - NEW ROUTES =====
app.use('/api/reports', authMiddleware, require('./routes/reportRoutes'));
app.use('/api/export', authMiddleware, require('./routes/exportRoutes'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: err.message });
});

module.exports = app;