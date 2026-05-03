// backend/scripts/full-reset.js
/**
 * COMPLETE SYSTEM RESET - ONE COMMAND DOES EVERYTHING
 * ===================================================
 * This script will:
 * 1. Drop ALL existing tables, types, and functions
 * 2. Recreate the complete database schema
 * 3. Hash all passwords properly (bcrypt)
 * 4. Verify everything is working
 * 5. Display all login credentials
 * 
 * Usage: node backend/scripts/full-reset.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Database connection
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '0012172004',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'inventory_db',
});

// Test credentials that will work after reset
const USERS = [
    { name: 'System Administrator', email: 'admin@ims.com', password: 'admin123', role: 'admin' },
    { name: 'Sales Manager', email: 'sales@ims.com', password: 'sales123', role: 'sales' },
    { name: 'Warehouse Manager', email: 'warehouse@ims.com', password: 'warehouse123', role: 'warehouse' },
    { name: 'Supply Manager', email: 'supply@ims.com', password: 'supply123', role: 'supply' }
];

async function fullReset() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║           COMPLETE SYSTEM RESET - ONE COMMAND                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    const client = await pool.connect();
    
    try {
        // ========================================
        // STEP 1: Drop everything (including types)
        // ========================================
        console.log('📌 STEP 1: Dropping existing tables, types, and functions...');
        console.log('─────────────────────────────────────────────────────────────\n');
        
        // First drop all tables with CASCADE
        await client.query(`
            DROP TABLE IF EXISTS discount_approvals CASCADE;
            DROP TABLE IF EXISTS adjustment_reasons CASCADE;
            DROP TABLE IF EXISTS product_requests CASCADE;
            DROP TABLE IF EXISTS audit_logs CASCADE;
            DROP TABLE IF EXISTS internal_requests CASCADE;
            DROP TABLE IF EXISTS internal_messages CASCADE;
            DROP TABLE IF EXISTS user_permissions CASCADE;
            DROP TABLE IF EXISTS permission_audit_log CASCADE;
            DROP TABLE IF EXISTS notifications CASCADE;
            DROP TABLE IF EXISTS system_settings CASCADE;
            DROP TABLE IF EXISTS order_items CASCADE;
            DROP TABLE IF EXISTS stock_movements CASCADE;
            DROP TABLE IF EXISTS sales_orders CASCADE;
            DROP TABLE IF EXISTS supply_orders CASCADE;
            DROP TABLE IF EXISTS product_locations CASCADE;
            DROP TABLE IF EXISTS inventory CASCADE;
            DROP TABLE IF EXISTS products CASCADE;
            DROP TABLE IF EXISTS categories CASCADE;
            DROP TABLE IF EXISTS suppliers CASCADE;
            DROP TABLE IF EXISTS warehouses CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
        `);
        console.log('   ✅ All tables dropped successfully');
        
        // Drop types (ignore if they don't exist)
        await client.query(`
            DROP TYPE IF EXISTS user_role CASCADE;
            DROP TYPE IF EXISTS order_status CASCADE;
            DROP TYPE IF EXISTS payment_status CASCADE;
            DROP TYPE IF EXISTS movement_type CASCADE;
            DROP TYPE IF EXISTS permission_level CASCADE;
        `);
        console.log('   ✅ All types dropped successfully\n');
        
        // ========================================
        // STEP 2: Create schema
        // ========================================
        console.log('📌 STEP 2: Creating database schema...');
        console.log('─────────────────────────────────────────────────────────────\n');
        
        const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
        
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found at: ${schemaPath}`);
        }
        
        let schema = fs.readFileSync(schemaPath, 'utf8');
        
        await client.query(schema);
        console.log('   ✅ Database schema created successfully\n');
        
        // ========================================
        // STEP 3: Hash all passwords
        // ========================================
        console.log('📌 STEP 3: Setting up user accounts...');
        console.log('─────────────────────────────────────────────────────────────\n');
        
        // First, delete any existing test users
        for (const user of USERS) {
            await client.query('DELETE FROM users WHERE email = $1', [user.email]);
        }
        
        // Insert users with hashed passwords
        for (const user of USERS) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            const isProtected = user.role === 'admin';
            
            await client.query(`
                INSERT INTO users (name, email, password_hash, role, is_active, is_protected)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [user.name, user.email, hashedPassword, user.role, true, isProtected]);
            
            console.log(`   ✅ ${user.email} (${user.role}) - password: ${user.password}`);
        }
        console.log('\n   ✅ All passwords securely hashed\n');
        
        // ========================================
        // STEP 4: Insert default settings
        // ========================================
        console.log('📌 STEP 4: Inserting default settings...');
        console.log('─────────────────────────────────────────────────────────────\n');
        
        await client.query(`
            INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
            ('session_timeout', '1440', 'integer', 'Session timeout in minutes'),
            ('password_expiry_days', '90', 'integer', 'Days until password expires'),
            ('max_login_attempts', '5', 'integer', 'Maximum failed login attempts'),
            ('default_tax_rate', '10', 'decimal', 'Default tax rate percentage'),
            ('discount_approval_threshold', '10', 'decimal', 'Discount % requiring admin approval'),
            ('low_stock_threshold', '10', 'integer', 'Units to trigger low stock alert'),
            ('email_notifications', 'false', 'boolean', 'Enable email notifications'),
            ('slack_notifications', 'false', 'boolean', 'Enable Slack notifications'),
            ('slack_webhook', '', 'string', 'Slack webhook URL')
            ON CONFLICT (setting_key) DO NOTHING;
        `);
        console.log('   ✅ Default settings inserted\n');
        
        // ========================================
        // STEP 5: Verify everything works
        // ========================================
        console.log('📌 STEP 5: Verifying database integrity...');
        console.log('─────────────────────────────────────────────────────────────\n');
        
        // Check user count
        const userCount = await client.query('SELECT COUNT(*) as count FROM users');
        console.log(`   ✅ Users table: ${userCount.rows[0].count} records`);
        
        // Check product count
        const productCount = await client.query('SELECT COUNT(*) as count FROM products');
        console.log(`   ✅ Products table: ${productCount.rows[0].count} records`);
        
        // Check warehouse count
        const warehouseCount = await client.query('SELECT COUNT(*) as count FROM warehouses');
        console.log(`   ✅ Warehouses table: ${warehouseCount.rows[0].count} records`);
        
        // Check inventory count
        const inventoryCount = await client.query('SELECT COUNT(*) as count FROM inventory');
        console.log(`   ✅ Inventory table: ${inventoryCount.rows[0].count} records`);
        
        // Verify admin password works
        const adminCheck = await client.query('SELECT * FROM users WHERE email = $1', ['admin@ims.com']);
        if (adminCheck.rows.length > 0) {
            const adminValid = await bcrypt.compare('admin123', adminCheck.rows[0].password_hash);
            console.log(`\n   🔐 Admin password verification: ${adminValid ? '✅ VALID' : '❌ INVALID'}`);
        }
        
        // ========================================
        // STEP 6: Display credentials
        // ========================================
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║                    LOGIN CREDENTIALS                         ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
        console.log('┌──────────────┬────────────────────────────┬─────────────────┐');
        console.log('│ Role         │ Email                      │ Password        │');
        console.log('├──────────────┼────────────────────────────┼─────────────────┤');
        for (const user of USERS) {
            const roleDisplay = user.role.padEnd(12);
            const emailDisplay = user.email.padEnd(26);
            const passwordDisplay = user.password.padEnd(15);
            console.log(`│ ${roleDisplay}│ ${emailDisplay}│ ${passwordDisplay}│`);
        }
        console.log('└──────────────┴────────────────────────────┴─────────────────┘');
        
        // ========================================
        // STEP 7: Test instructions
        // ========================================
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║                    HOW TO TEST LOGIN                         ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
        console.log('1️⃣  Start your server:');
        console.log('   npm run dev\n');
        
        console.log('2️⃣  Test with curl:');
        console.log('   curl -X POST http://localhost:3000/api/auth/login \\');
        console.log('     -H "Content-Type: application/json" \\');
        console.log('     -d \'{"email":"admin@ims.com","password":"admin123"}\'\n');
        
        console.log('3️⃣  Or open in browser:');
        console.log('   http://localhost:3000\n');
        
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║                    RESET COMPLETE! 🎉                        ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
    } catch (error) {
        console.error('\n❌ RESET FAILED:', error.message);
        console.error('\nPossible issues:');
        console.error('   1. Database is not running');
        console.error('   2. Wrong database credentials in .env file');
        console.error('   3. Schema file has errors');
        console.error('\nCheck your .env file and make sure PostgreSQL is running.\n');
        throw error;
    } finally {
        await client.release();
        await pool.end();
    }
}

// Run the reset
fullReset().catch(console.error);