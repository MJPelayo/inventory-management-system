/**
 * PASSWORD RESET UTILITY (SAFETY NET)
 * Run this script if you forget your password.
 * 
 * Usage:
 *   node backend/scripts/reset-password.js
 *   node backend/scripts/reset-password.js admin@ims.com
 *   node backend/scripts/reset-password.js admin@ims.com newpassword
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '0012172004',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'inventory_db',
});

async function resetPassword(targetEmail, newPassword) {
    console.log('\n🔐 PASSWORD RESET UTILITY\n');
    console.log('========================================');

    try {
        // Query users
        const users = await pool.query('SELECT id, email, name, role FROM users ORDER BY id');

        if (users.rows.length === 0) {
            console.log('❌ No users found in the database.');
            console.log('Run the database schema first.\n');
            return;
        }

        // Show available users
        console.log('Available users:');
        users.rows.forEach(user => {
            console.log(`   ${user.id}. ${user.email} (${user.name} - ${user.role})`);
        });
        console.log('========================================');

        // If no email provided, show usage and exit
        if (!targetEmail) {
            console.log('\nUsage: node backend/scripts/reset-password.js <email> <newpassword>');
            console.log('Example: node backend/scripts/reset-password.js admin@ims.com admin123\n');
            return;
        }

        // Check if user exists
        const userResult = await pool.query('SELECT id, email, name, role FROM users WHERE email = $1', [targetEmail]);
        
        if (userResult.rows.length === 0) {
            console.log(`\n❌ User with email "${targetEmail}" not found.\n`);
            return;
        }

        const user = userResult.rows[0];
        const defaultPassword = newPassword || 'admin123';

        // Hash the new password
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [hashedPassword, user.id]
        );

        console.log('\n✅ Password reset successful!');
        console.log('========================================');
        console.log(`📧 Email:      ${user.email}`);
        console.log(`👤 Name:       ${user.name}`);
        console.log(`🔑 New Password: ${defaultPassword}`);
        console.log(`🛡️  Role:       ${user.role}`);
        console.log('========================================');
        console.log('\nYou can now login with these credentials.\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

// Get command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

resetPassword(email, newPassword);