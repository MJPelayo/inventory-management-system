/**
 * SHOW CREDENTIALS UTILITY
 * Displays current database and admin credentials.
 * 
 * Usage:
 *   node backend/scripts/show-credentials.js
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '0012172004',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'inventory_db',
});

async function showCredentials() {
    console.log('\n📋 CREDENTIALS DISPLAY\n');
    console.log('========================================');
    
    // Show database credentials from .env
    console.log('🗄️  DATABASE CREDENTIALS (from .env):');
    console.log('----------------------------------------');
    console.log(`   Host:     ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Port:     ${process.env.DB_PORT || '5432'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'inventory_db'}`);
    console.log(`   User:     ${process.env.DB_USER || 'postgres'}`);
    console.log(`   Password: ${process.env.DB_PASSWORD || '0012172004'}`);
    console.log('----------------------------------------');

    try {
        // Test database connection
        const client = await pool.connect();
        console.log('\n✅ Database connection successful!\n');
        
        // Query admin users
        const result = await client.query(
            'SELECT id, email, name, role FROM users WHERE role = $1 ORDER BY id',
            ['admin']
        );

        if (result.rows.length > 0) {
            console.log('👥 ADMIN USERS:');
            console.log('----------------------------------------');
            result.rows.forEach(user => {
                console.log(`   ID:    ${user.id}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Name:  ${user.name}`);
                console.log(`   Role:  ${user.role}`);
                console.log('----------------------------------------');
            });
            console.log('\n⚠️  Note: Passwords are hashed and cannot be displayed.');
            console.log('Use "npm run reset-password" to reset a forgotten password.\n');
        } else {
            console.log('\nℹ️  No admin users found in the database.\n');
        }
        
        client.release();
    } catch (error) {
        console.error('\n❌ Database connection failed:', error.message);
        console.log('\n💡 Make sure PostgreSQL is running and .env file is configured correctly.\n');
    } finally {
        await pool.end();
    }
}

showCredentials();