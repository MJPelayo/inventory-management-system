/**
 * QUICK DATABASE RESET
 * Even simpler - just drops and recreates everything
 * 
 * Usage: node scripts/quick-reset.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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
        // Read schema
        const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
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