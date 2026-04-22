/**
 * QUICK DATABASE RESET
 * Even simpler - just drops and recreates everything
 * 
 * Usage: node backend/scripts/quick-reset.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '0012172004',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'inventory_db',
});

async function quickReset() {
    console.log('\n🔄 Quick Database Reset...\n');
    
    try {
        // Drop all tables and types in correct order (respecting foreign keys)
        await pool.query(`
            DROP TABLE IF EXISTS discount_approvals CASCADE;
            DROP TABLE IF EXISTS adjustment_reasons CASCADE;
            DROP TABLE IF EXISTS product_requests CASCADE;
            DROP TABLE IF EXISTS audit_logs CASCADE;
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
            DROP TYPE IF EXISTS user_role CASCADE;
            DROP TYPE IF EXISTS order_status CASCADE;
            DROP TYPE IF EXISTS payment_status CASCADE;
            DROP TYPE IF EXISTS movement_type CASCADE;
        `);
        
        console.log('🗑️  Dropped existing tables and types...');
        
        // Read schema
        const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute entire schema
        await pool.query(schema);
        
        console.log('✅ Database reset complete!\n');
        console.log('Test with: curl http://localhost:3000/api/products\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

quickReset();