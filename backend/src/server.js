// backend/src/server.js
const { app, ensureDefaultAdmin } = require('./app');
const pool = require('./db/pool');

const PORT = process.env.PORT || 3000;

// Initialize database and start server
async function startServer() {
    try {
        // Test database connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected successfully');
        
        // Ensure default admin account exists
        await ensureDefaultAdmin();
        
        // Start server
        app.listen(PORT, () => {
            console.log(`\n🚀 Server running on http://localhost:${PORT}`);
            console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
            console.log(`🌐 Frontend: http://localhost:${PORT}`);
            console.log(`📁 Pages: http://localhost:${PORT}/pages/admin/dashboard.html`);
            console.log('\n📋 Available API Endpoints:');
            console.log('   POST   /api/auth/login     - Login');
            console.log('   GET    /api/products       - Get all products');
            console.log('   GET    /api/inventory/low-stock - Low stock alerts');
            console.log('   POST   /api/orders/sales   - Create sales order');
            console.log('   GET    /api/reports/sales  - Sales report');
            console.log('   GET    /api/export/users   - Export users (admin only)');
            console.log('\n💡 Test login with:');
            console.log('   curl -X POST http://localhost:3000/api/auth/login \\');
            console.log('     -H "Content-Type: application/json" \\');
            console.log('     -d \'{"email":"admin@ims.com","password":"admin123"}\'');
            console.log('\n🔐 Default credentials:');
            console.log('   Admin:    admin@ims.com / admin123');
            console.log('   Sales:    sales@ims.com / sales123');
            console.log('   Warehouse: warehouse@ims.com / warehouse123');
            console.log('   Supply:   supply@ims.com / supply123\n');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

startServer();