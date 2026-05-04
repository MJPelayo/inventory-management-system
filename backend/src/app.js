// backend/src/app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const pool = require('./db/pool');
const path = require('path');  // IMPORTANT: Add this for file serving

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// SANITIZATION MIDDLEWARE
// ============================================

const { sanitizeRequestBody, sanitizeQueryParams } = require('./middleware/sanitize');
const { sqlInjectionProtection } = require('./middleware/security');

// Apply SQL injection protection before routes
app.use(sqlInjectionProtection);

// Apply sanitization to all routes (except auth to avoid password issues)
app.use(sanitizeQueryParams);
app.use('/api', (req, res, next) => {
    // Skip sanitization for auth routes (preserve password)
    if (req.path === '/auth/login' || req.path === '/auth/register') {
        return next();
    }
    sanitizeRequestBody(req, res, next);
});

// ============================================
// SERVE STATIC FRONTEND FILES
// ============================================

// Serve static files from the frontend directory
// This will serve CSS, JS, and HTML files directly
app.use(express.static(path.join(__dirname, '../../frontend')));

// Also serve the pages directory
app.use('/pages', express.static(path.join(__dirname, '../../frontend/pages')));

// ============================================
// API ROUTES (Your existing backend routes)
// ============================================

// Import auth middleware (proper JWT-based authentication)
const { authenticateToken, optionalAuth } = require('./middleware/auth');

// Routes - Public routes first (no auth required)
app.use('/api/auth', require('./routes/authRoutes'));

// Protected routes - require authentication via JWT token
app.use('/api/users', authenticateToken, require('./routes/userRoutes'));
app.use('/api/products', authenticateToken, require('./routes/productRoutes'));
app.use('/api/categories', authenticateToken, require('./routes/categoryRoutes'));
app.use('/api/suppliers', authenticateToken, require('./routes/supplierRoutes'));
app.use('/api/warehouses', authenticateToken, require('./routes/warehouseRoutes'));
app.use('/api/inventory', authenticateToken, require('./routes/inventoryRoutes'));
app.use('/api/orders', authenticateToken, require('./routes/orderRoutes'));
app.use('/api/reports', authenticateToken, require('./routes/reportRoutes'));
app.use('/api/export', authenticateToken, require('./routes/exportRoutes'));

// Audit Log Routes (admin only)
app.use('/api/audit-logs', require('./routes/auditLogRoutes'));

// ============================================
// NEW ROUTES (Permissions, Settings, Messages, Requests, Notifications)
// ============================================

// Permission routes
app.use('/api/permissions', require('./routes/permissionRoutes'));

// Settings routes
app.use('/api/settings', require('./routes/settingsRoutes'));

// Message routes
app.use('/api/messages', authenticateToken, require('./routes/messageRoutes'));

// Request routes
app.use('/api/requests', authenticateToken, require('./routes/requestRoutes'));

// Notification routes
app.use('/api/notifications', authenticateToken, require('./routes/notificationRoutes'));
app.use('/api/payment-terms', authenticateToken, require('./routes/paymentTermRoutes'));
app.use('/api/dropdowns', authenticateToken, require('./routes/dropdownRoutes'));

// ============================================
// SYSTEM ROUTES (for frontend compatibility)
// ============================================

// Message routes (already have)
app.use('/api/messages', authenticateToken, require('./routes/messageRoutes'));

// System aliases for frontend
app.use('/api/system/messages', authenticateToken, require('./routes/messageRoutes'));
app.use('/api/system/requests', authenticateToken, require('./routes/requestRoutes'));
app.use('/api/system/notifications', authenticateToken, require('./routes/notificationRoutes'));

// Also add unread count endpoint for messages
app.get('/api/system/messages/unread', authenticateToken, async (req, res) => {
    try {
        const pool = require('./db/pool');
        const result = await pool.query(
            `SELECT COUNT(*) as count FROM internal_messages
             WHERE recipient_id = $1 AND is_read = false`,
            [req.user.id]
        );
        res.json({ success: true, count: parseInt(result.rows[0].count) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check (public endpoint)
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================
// CLIENT-SIDE ROUTING (Catch-all for frontend)
// ============================================

// For any other route that's not an API route, serve the frontend
// This allows your frontend to handle its own routing (like dashboard.html, users.html, etc.)
app.get('*', (req, res, next) => {
    // Skip API routes (already handled above)
    if (req.path.startsWith('/api/')) {
        return next();
    }
    
    // If the request is for a specific file that exists, let express.static handle it
    // Otherwise, serve index.html for client-side routing
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: err.message });
});

/**
 * Helper to mask a password for safe logging.
 * Shows first and last character, replaces middle with asterisks.
 * @param {string} password - The plaintext password
 * @returns {string} Masked password string
 */
function maskPassword(password) {
    if (!password || password.length === 0) return '****';
    if (password.length <= 2) return '*'.repeat(password.length);
    return password[0] + '*'.repeat(password.length - 2) + password[password.length - 1];
}

/**
 * Ensure default admin and test accounts exist in the database.
 * Creates accounts only if they don't already exist.
 * Logs credentials in a masked format to avoid exposing plaintext passwords.
 */
async function ensureDefaultAdmin() {
    try {
        // Check if admin exists
        const result = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@ims.com']);

        if (result.rows.length === 0) {
            // Hash the default password
            const defaultPassword = 'admin123';
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            // Create default admin
            await pool.query(`
                INSERT INTO users (name, email, password_hash, role, is_active)
                VALUES ($1, $2, $3, $4, $5)
            `, ['System Administrator', 'admin@ims.com', hashedPassword, 'admin', true]);

            console.log('\n========================================');
            console.log('🔐 DEFAULT ADMIN ACCOUNT CREATED');
            console.log('========================================');
            console.log('📧 Email: admin@ims.com');
            console.log('🔑 Password: ' + maskPassword(defaultPassword));
            console.log('⚠️  Please change this password after first login');
            console.log('========================================\n');
        } else {
            console.log('\n✅ Default admin account exists');
            console.log('📧 Email: admin@ims.com');
            console.log('🔑 Use your configured password to login');
            console.log('========================================\n');
        }

        // Also ensure other role accounts exist for testing
        const testUsers = [
            { name: 'Sales User', email: 'sales@ims.com', password: 'sales123', role: 'sales' },
            { name: 'Warehouse User', email: 'warehouse@ims.com', password: 'warehouse123', role: 'warehouse' },
            { name: 'Supply User', email: 'supply@ims.com', password: 'supply123', role: 'supply' }
        ];

        for (const testUser of testUsers) {
            const existing = await pool.query('SELECT * FROM users WHERE email = $1', [testUser.email]);
            if (existing.rows.length === 0) {
                const hashedPassword = await bcrypt.hash(testUser.password, 10);
                await pool.query(`
                    INSERT INTO users (name, email, password_hash, role, is_active)
                    VALUES ($1, $2, $3, $4, $5)
                `, [testUser.name, testUser.email, hashedPassword, testUser.role, true]);
                console.log(`✅ Created ${testUser.role} account: ${testUser.email} / ${maskPassword(testUser.password)}`);
            }
        }

    } catch (error) {
        console.error('Error ensuring default admin:', error.message);
    }
}

module.exports = { app, ensureDefaultAdmin };