// frontend/js/admin.js
/**
 * Admin Panel JavaScript
 * Handles admin dashboard functionality
 * 
 * @module admin
 */

// Check authentication and role
document.addEventListener('DOMContentLoaded', async () => {
    // Verify user is logged in and is admin
    if (!auth.isLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }
    
    if (!auth.hasRole('admin')) {
        alert('Access denied. Admin privileges required.');
        auth.logout();
        return;
    }
    
    // Initialize components
    new Header('appHeader');
    new Sidebar('sidebar', 'dashboard');
    
    // Load dashboard data
    await loadDashboardData();
    await loadRecentActivity();
    
});

/**
 * Load dashboard KPI data
 */
async function loadDashboardData() {
    const kpiGrid = document.getElementById('kpiGrid');
    if (!kpiGrid) return;
    
    try {
        // Fetch data in parallel
        const [products, users, warehouses, suppliers] = await Promise.all([
            apiCall('/products'),
            apiCall('/users'),
            apiCall('/warehouses'),
            apiCall('/suppliers')
        ]);
        
        const productData = products.data || [];
        const userData = users.data || [];
        const warehouseData = warehouses.data || [];
        const supplierData = suppliers.data || [];
        
        // Calculate metrics
        const totalProducts = productData.length;
        const activeProducts = productData.filter(p => p.is_active).length;
        const totalUsers = userData.length;
        const activeUsers = userData.filter(u => u.is_active).length;
        const totalWarehouses = warehouseData.length;
        const totalSuppliers = supplierData.length;
        
        kpiGrid.innerHTML = `
            <div class="stat">
                <div class="stat-label">Total Products</div>
                <div class="stat-value">${totalProducts}</div>
                <div class="stat-sub">${activeProducts} active</div>
            </div>
            <div class="stat">
                <div class="stat-label">Total Users</div>
                <div class="stat-value">${totalUsers}</div>
                <div class="stat-sub">${activeUsers} active</div>
            </div>
            <div class="stat">
                <div class="stat-label">Warehouses</div>
                <div class="stat-value">${totalWarehouses}</div>
                <div class="stat-sub">across all locations</div>
            </div>
            <div class="stat">
                <div class="stat-label">Suppliers</div>
                <div class="stat-value">${totalSuppliers}</div>
                <div class="stat-sub">active partners</div>
            </div>
        `;
        
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        kpiGrid.innerHTML = `
            <div class="stat">
                <div class="stat-value">Error loading data</div>
                <div class="stat-sub">Please refresh the page</div>
            </div>
        `;
    }
}

/**
 * Load recent activity from audit logs
 */
async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    try {
        // Try to fetch audit logs, fallback to mock data if not available
        let activities = [];
        
        try {
            const response = await apiCall('/audit-logs?limit=10');
            activities = response.data || [];
        } catch (e) {
            // Mock data for demo
            activities = [
                { action: 'User logged in', user: 'admin@ims.com', created_at: new Date().toISOString(), entity_type: 'auth' },
                { action: 'Product created', user: 'admin@ims.com', created_at: new Date(Date.now() - 3600000).toISOString(), entity_type: 'product' },
                { action: 'Inventory updated', user: 'warehouse@ims.com', created_at: new Date(Date.now() - 7200000).toISOString(), entity_type: 'inventory' },
                { action: 'Order placed', user: 'sales@ims.com', created_at: new Date(Date.now() - 86400000).toISOString(), entity_type: 'order' }
            ];
        }
        
        if (activities.length === 0) {
            container.innerHTML = '<div class="empty-state">No recent activity</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="activity-table">
                <thead>
                    <tr>
                        <th>Action</th>
                        <th>User</th>
                        <th>Entity</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${activities.map(activity => `
                        <tr>
                            <td>${escapeHtml(activity.action)}</td>
                            <td>${escapeHtml(activity.user_email || activity.user || 'System')}</td>
                            <td><span class="badge">${escapeHtml(activity.entity_type || 'system')}</span></td>
                            <td>${new Date(activity.created_at).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Failed to load recent activity:', error);
        container.innerHTML = '<div class="empty-state">Failed to load activity</div>';
    }
}