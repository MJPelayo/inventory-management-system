// frontend/js/warehouse.js


// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Warehouse Dashboard loading...');
    
    // Check authentication and role
    if (!auth.isLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }
    
    if (!auth.hasRole(['warehouse', 'admin'])) {
        alert('Access denied. Warehouse privileges required.');
        auth.logout();
        return;
    }
    
    // Initialize header and sidebar
    new Header('appHeader');
    new Sidebar('sidebar', 'dashboard');
    
    // Initialize chat system after auth is confirmed
    if (auth.isLoggedIn() && typeof ChatSystem !== 'undefined') {
        window.chatSystem = new ChatSystem();
    }
    
    // Display user greeting
    displayUserGreeting();
    
    // Load dashboard data
    await loadDashboardStats();
    await loadLowStockAlerts();
    await loadRecentMovements();
    await loadPendingOrders();
});

// ============================================
// DISPLAY USER GREETING
// ============================================
function displayUserGreeting() {
    const user = auth.getCurrentUser();
    const greetingElement = document.getElementById('userGreeting');
    if (greetingElement && user) {
        const hour = new Date().getHours();
        let greeting = 'Good ';
        if (hour < 12) greeting += 'Morning';
        else if (hour < 18) greeting += 'Afternoon';
        else greeting += 'Evening';
        
        greetingElement.textContent = `${greeting}, ${user.name || 'Warehouse Associate'}!`;
    }
}

// ============================================
// LOAD DASHBOARD STATISTICS
// ============================================
async function loadDashboardStats() {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;
    
    try {
        // Get user's assigned warehouse
        const user = auth.getCurrentUser();
        const warehouseId = user.warehouse_id || 1; // Fallback to first warehouse
        
        // Fetch inventory for this warehouse
        const inventoryRes = await apiCall(`/inventory/warehouse/${warehouseId}`);
        const inventory = inventoryRes.data || [];
        
        // Fetch low stock items
        const lowStockRes = await apiCall('/inventory/low-stock');
        const lowStock = lowStockRes.data || [];
        const myLowStock = lowStock.filter(item => item.warehouse_id === warehouseId);
        
        // Calculate stats
        const totalProducts = inventory.length;
        const totalUnits = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalValue = inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
        const lowStockCount = myLowStock.length;
        
        statsGrid.innerHTML = `
            <div class="stat">
                <div class="stat-label">Total Products</div>
                <div class="stat-value">${totalProducts}</div>
                <div class="stat-sub">unique SKUs</div>
            </div>
            <div class="stat">
                <div class="stat-label">Total Units</div>
                <div class="stat-value">${totalUnits.toLocaleString()}</div>
                <div class="stat-sub">in stock</div>
            </div>
            <div class="stat">
                <div class="stat-label">Inventory Value</div>
                <div class="stat-value">$${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <div class="stat-sub">at retail price</div>
            </div>
            <div class="stat ${lowStockCount > 0 ? 'stat-warning' : ''}">
                <div class="stat-label">Low Stock Alerts</div>
                <div class="stat-value">${lowStockCount}</div>
                <div class="stat-sub">items need reorder</div>
            </div>
        `;
        
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        statsGrid.innerHTML = '<div class="error-state">Failed to load statistics</div>';
    }
}

// ============================================
// LOAD LOW STOCK ALERTS
// ============================================
async function loadLowStockAlerts() {
    const container = document.getElementById('lowStockList');
    if (!container) return;
    
    try {
        const user = auth.getCurrentUser();
        const warehouseId = user.warehouse_id || 1;
        
        const response = await apiCall('/inventory/low-stock');
        const allLowStock = response.data || [];
        const myLowStock = allLowStock.filter(item => item.warehouse_id === warehouseId);
        
        if (myLowStock.length === 0) {
            container.innerHTML = '<div class="empty-state">✅ No low stock items. All inventory levels are healthy.</div>';
            return;
        }
        
        container.innerHTML = myLowStock.map(item => `
            <div class="low-stock-item">
                <div class="low-stock-info">
                    <span class="product-name">${escapeHtml(item.product_name || 'Product ID: ' + item.product_id)}</span>
                    <span class="product-sku">${escapeHtml(item.sku || '—')}</span>
                </div>
                <div class="low-stock-details">
                    <span class="current-qty">Current: ${item.quantity}</span>
                    <span class="reorder-point">Reorder at: ${item.reorder_point}</span>
                    <button class="btn-sm btn-warning" onclick="window.location.href='inventory.html'">Reorder</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load low stock alerts:', error);
        container.innerHTML = '<div class="error-state">Failed to load alerts</div>';
    }
}

// ============================================
// LOAD RECENT STOCK MOVEMENTS
// ============================================
async function loadRecentMovements() {
    const container = document.getElementById('recentMovements');
    if (!container) return;
    
    try {
        const user = auth.getCurrentUser();
        const warehouseId = user.warehouse_id || 1;
        
        // Fetch recent movements (last 10)
        const response = await apiCall(`/inventory/movements?limit=10`);
        const movements = response.data || [];
        const myMovements = movements.filter(m => m.warehouse_id === warehouseId);
        
        if (myMovements.length === 0) {
            container.innerHTML = '<div class="empty-state">No recent stock movements</div>';
            return;
        }
        
        container.innerHTML = myMovements.map(movement => {
            let typeIcon = '';
            let typeClass = '';
            
            switch (movement.movement_type) {
                case 'received':
                    typeIcon = '📥';
                    typeClass = 'movement-received';
                    break;
                case 'sold':
                    typeIcon = '💰';
                    typeClass = 'movement-sold';
                    break;
                case 'transferred':
                    typeIcon = '🔄';
                    typeClass = 'movement-transferred';
                    break;
                case 'adjusted':
                    typeIcon = '✏️';
                    typeClass = 'movement-adjusted';
                    break;
                default:
                    typeIcon = '📋';
                    typeClass = '';
            }
            
            const quantityChange = movement.quantity_change;
            const quantityDisplay = quantityChange > 0 ? `+${quantityChange}` : `${quantityChange}`;
            const quantityClass = quantityChange > 0 ? 'positive' : quantityChange < 0 ? 'negative' : '';
            
            return `
                <div class="movement-item ${typeClass}">
                    <div class="movement-icon">${typeIcon}</div>
                    <div class="movement-info">
                        <div class="movement-product">${escapeHtml(movement.product_name || 'Product ID: ' + movement.product_id)}</div>
                        <div class="movement-meta">
                            <span class="movement-type">${movement.movement_type}</span>
                            <span class="movement-date">${formatDate(movement.created_at)}</span>
                        </div>
                    </div>
                    <div class="movement-quantity ${quantityClass}">${quantityDisplay}</div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Failed to load recent movements:', error);
        container.innerHTML = '<div class="error-state">Failed to load movements</div>';
    }
}

// ============================================
// LOAD PENDING ORDERS
// ============================================
async function loadPendingOrders() {
    const container = document.getElementById('pendingOrdersList');
    if (!container) return;
    
    try {
        // FIX: Make separate requests instead of comma-separated
        let allOrders = [];
        
        try {
            const pendingRes = await apiCall('/orders/sales?status=pending');
            allOrders = allOrders.concat(pendingRes.data || []);
        } catch (e) {}
        
        try {
            const processingRes = await apiCall('/orders/sales?status=processing');
            allOrders = allOrders.concat(processingRes.data || []);
        } catch (e) {}
        
        const pendingOrders = allOrders;
        
        if (pendingOrders.length === 0) {
            container.innerHTML = '<div class="empty-state">✅ No pending orders. All caught up!</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="pending-orders-table">
                <thead>
                    <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${pendingOrders.map(order => `
                        <tr>
                            <td><strong>${escapeHtml(order.order_number)}</strong></td>
                            <td>${escapeHtml(order.customer_name)}</td>
                            <td>${order.items?.length || 0} item(s)</td>
                            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                            <td>
                                <button class="btn-sm btn-primary" onclick="viewOrderDetails(${order.id})">Pick</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Failed to load pending orders:', error);
        container.innerHTML = '<div class="error-state">Failed to load orders</div>';
    }
}

// ============================================
// VIEW ORDER DETAILS (for picking)
// ============================================
async function viewOrderDetails(orderId) {
    try {
        const response = await apiCall(`/orders/sales/${orderId}`);
        const order = response.data;
        
        // Store order for pick list generation
        window.currentOrder = order;
        
        // Show order details in a modal
        const items = order.items || [];
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        
        const modalHtml = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>Order Details: ${escapeHtml(order.order_number)}</h2>
                    <button class="close-btn" onclick="closeViewOrderModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="order-info">
                        <p><strong>Customer:</strong> ${escapeHtml(order.customer_name)}</p>
                        <p><strong>Delivery Type:</strong> ${order.delivery_type === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}</p>
                        ${order.shipping_address ? `<p><strong>Address:</strong> ${escapeHtml(order.shipping_address)}</p>` : ''}
                    </div>
                    
                    <h4>Items to Pick (${totalItems} total units)</h4>
                    <table class="order-items-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Quantity</th>
                                <th>Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td>${escapeHtml(item.product_name || 'Product ID: ' + item.product_id)}</td>
                                    <td>${item.quantity}</td>
                                    <td class="location-cell">—</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="closeViewOrderModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="generatePicklistFromOrder(${order.id})">Generate Pick List</button>
                </div>
            </div>
        `;
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'viewOrderModal';
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Failed to load order details:', error);
        showToast('Failed to load order details', 'error');
    }
}

function closeViewOrderModal() {
    const modal = document.getElementById('viewOrderModal');
    if (modal) modal.remove();
}

// ============================================
// GENERATE PICKLIST FROM ORDER
// ============================================
async function generatePicklistFromOrder(orderId) {
    try {
        showToast('Generating pick list...', 'info');
        
        // Redirect to picklists page with order ID
        window.location.href = `picklists.html?orderId=${orderId}`;
        
    } catch (error) {
        console.error('Failed to generate pick list:', error);
        showToast('Failed to generate pick list', 'error');
    }
}

// ============================================
// REFRESH DASHBOARD
// ============================================
function refreshDashboard() {
    loadDashboardStats();
    loadLowStockAlerts();
    loadRecentMovements();
    loadPendingOrders();
    showToast('Dashboard refreshed', 'info');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showToast(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ============================================
window.refreshDashboard = refreshDashboard;
window.viewOrderDetails = viewOrderDetails;
window.closeViewOrderModal = closeViewOrderModal;
window.generatePicklistFromOrder = generatePicklistFromOrder;

console.log('✅ Warehouse Dashboard module loaded');