// Simple test script to verify stock API endpoints
const http = require('http');

const BASE_URL = 'http://localhost:3000/api';

// Test credentials (from sample data)
const TEST_USER = 'warehouse@ims.com';

async function makeRequest(method, path, token = null, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port || 3000,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('=== Stock API Test ===\n');

    // Step 1: Login as warehouse user
    console.log('1. Logging in as warehouse@ims.com...');
    const loginResult = await makeRequest('POST', '/auth/login', null, {
        email: TEST_USER,
        password: 'warehouse123'
    });
    
    if (loginResult.status !== 200) {
        console.error('Login failed:', loginResult.data);
        return;
    }
    
    const token = loginResult.data.token;
    console.log('   ✓ Login successful, token received\n');

    // Step 2: Get warehouses
    console.log('2. Fetching warehouses...');
    const warehousesResult = await makeRequest('GET', '/warehouses', token);
    console.log('   Response:', JSON.stringify(warehousesResult.data, null, 2));
    
    if (warehousesResult.status !== 200 || !warehousesResult.data.data || warehousesResult.data.data.length === 0) {
        console.error('   ✗ No warehouses found');
        return;
    }
    console.log('   ✓ Warehouses fetched\n');

    // Step 3: Get products
    console.log('3. Fetching products...');
    const productsResult = await makeRequest('GET', '/products', token);
    console.log('   Response:', JSON.stringify(productsResult.data, null, 2));
    
    if (productsResult.status !== 200 || !productsResult.data.data || productsResult.data.data.length === 0) {
        console.error('   ✗ No products found');
        return;
    }
    console.log('   ✓ Products fetched\n');

    // Step 4: Get current inventory
    console.log('4. Fetching current inventory...');
    const inventoryResult = await makeRequest('GET', '/stock/inventory', token);
    console.log('   Response:', JSON.stringify(inventoryResult.data, null, 2));
    console.log('');

    // Step 5: Test receive stock
    const productId = productsResult.data.data[0].id;
    const warehouseId = warehousesResult.data.data[0].id;
    
    console.log(`5. Testing RECEIVE stock (product=${productId}, warehouse=${warehouseId})...`);
    const receiveResult = await makeRequest('POST', '/stock/receive', token, {
        product_id: productId,
        warehouse_id: warehouseId,
        quantity: 10,
        reason: 'API Test - Receive',
        performed_by: loginResult.data.user.id
    });
    console.log('   Response:', JSON.stringify(receiveResult.data, null, 2));
    console.log('');

    // Step 6: Test transfer stock
    const destWarehouseId = warehousesResult.data.data.length > 1 ? warehousesResult.data.data[1].id : warehouseId;
    if (destWarehouseId !== warehouseId) {
        console.log(`6. Testing TRANSFER stock (from=${warehouseId}, to=${destWarehouseId})...`);
        const transferResult = await makeRequest('POST', '/stock/transfer', token, {
            product_id: productId,
            from_warehouse_id: warehouseId,
            to_warehouse_id: destWarehouseId,
            quantity: 5,
            reason: 'API Test - Transfer',
            performed_by: loginResult.data.user.id
        });
        console.log('   Response:', JSON.stringify(transferResult.data, null, 2));
        console.log('');
    }

    // Step 7: Test adjust stock
    console.log(`7. Testing ADJUST stock (product=${productId}, warehouse=${warehouseId})...`);
    const adjustResult = await makeRequest('POST', '/stock/adjust', token, {
        product_id: productId,
        warehouse_id: warehouseId,
        quantity: -2,
        reason: 'API Test - Adjustment for damaged goods',
        performed_by: loginResult.data.user.id
    });
    console.log('   Response:', JSON.stringify(adjustResult.data, null, 2));
    console.log('');

    // Step 8: Check audit logs
    console.log('8. Fetching audit logs...');
    const auditResult = await makeRequest('GET', '/audit/logs?limit=10', token);
    console.log('   Response:', JSON.stringify(auditResult.data, null, 2));
    console.log('');

    console.log('=== All tests completed ===');
}

runTests().catch(err => {
    console.error('Test error:', err.message);
    process.exit(1);
});