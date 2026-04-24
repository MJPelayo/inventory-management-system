/**
 * DISPLAY ALL SYSTEM CREDENTIALS
 * Run this anytime to see all login credentials
 * 
 * Usage: node backend/scripts/show-credentials.js
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
    console.log('\n🔐 SYSTEM LOGIN CREDENTIALS');
    console.log('========================================\n');
    
    // Show database credentials from .env
    console.log('🗄️  DATABASE CREDENTIALS (from .env):');
    console.log('----------------------------------------');
    console.log(`   Host:     ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Port:     ${process.env.DB_PORT || '5432'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'inventory_db'}`);
    console.log(`   User:     ${process.env.DB_USER || 'postgres'}`);
    console.log(`   Password: ${process.env.DB_PASSWORD || '0012172004'}`);
    console.log('----------------------------------------\n');
    
    try {
        // Test database connection
        const client = await pool.connect();
        console.log('✅ Database connection successful!\n');
        
        const result = await client.query(`
            SELECT id, email, name, role, is_active 
            FROM users 
            ORDER BY 
                CASE role 
                    WHEN 'admin' THEN 1 
                    WHEN 'sales' THEN 2 
                    WHEN 'warehouse' THEN 3 
                    WHEN 'supply' THEN 4 
                END,
                id
        `);
        
        if (result.rows.length === 0) {
            console.log('⚠️  No users found in database.');
            console.log('Please run the server first to create default accounts.\n');
        } else {
            console.log('╔════╤════════════════════════════╤══════════════════════╤═════════════╤════════╗');
            console.log('║ ID │ Email                      │ Password             │ Role        │ Active ║');
            console.log('╠════╪════════════════════════════╪══════════════════════╪═════════════╪════════╣');
            
            for (const user of result.rows) {
                let defaultPassword = '';
                if (user.email === 'admin@ims.com') defaultPassword = 'admin123';
                else if (user.email === 'sales@ims.com') defaultPassword = 'sales123';
                else if (user.email === 'warehouse@ims.com') defaultPassword = 'warehouse123';
                else if (user.email === 'supply@ims.com') defaultPassword = 'supply123';
                else defaultPassword = '(custom)';
                
                const activeStatus = user.is_active ? '✓' : '✗';
                console.log(`║ ${String(user.id).padEnd(3)}│ ${user.email.padEnd(30)}│ ${defaultPassword.padEnd(20)}│ ${user.role.padEnd(11)}│ ${activeStatus.padEnd(6)}║`);
            }
            
            console.log('╚════╧════════════════════════════╧══════════════════════╧═════════════╧════════╝');
        }
        
        client.release();
        
        console.log('\n💡 To reset any password:');
        console.log('   npm run reset-password <email> <newpassword>');
        console.log('   Example: npm run reset-password admin@ims.com admin123\n');
        
    } catch (error) {
        console.error('Error fetching users:', error.message);
        console.log('\nMake sure your database is running and the server has been started at least once.\n');
    } finally {
        await pool.end();
    }
}

showCredentials();