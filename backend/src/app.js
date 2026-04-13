// backend/src/app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const pool = require('./db/pool');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
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
        database: pool.options.database
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
            users: 'GET/POST/PUT/DELETE /api/users',
            users_by_id: 'GET/PUT/DELETE /api/users/:id'
        }
    });
});

// User routes
app.use('/api/users', userRoutes);

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
                                                  
INVENTORY MANAGEMENT SYSTEM API
Server running on port: ${PORT}
 Environment: ${process.env.NODE_ENV || 'development'}
                                                  
Health Check: http://localhost:${PORT}/api/health
 Users API:    http://localhost:${PORT}/api/users

    `);
});

module.exports = app;