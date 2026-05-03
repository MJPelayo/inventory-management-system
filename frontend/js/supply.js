// frontend/js/supply.js


// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Supply Dashboard loading...');
    
    // Check authentication and role
    if (!auth.isLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }
    
    if (!auth.hasRole(['supply', 'admin'])) {
        alert('Access denied. Supply privileges required.');
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
    await loadReorderSuggestions();
    await loadRecentPOs();
    await loadBudgetUtilization();
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
        
        greetingElement.textContent = `${greeting}, ${user.name || 'Supply Manager'}!`;
    }
}

// ============================================
// LOAD DASHBOARD STATISTICS
// ============================================
async function loadDashboardStats() {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;
    
    try {
        const user = auth.getCurrentUser();
        const budget = user.purchase_budget || 100000; // Default budget
        
        // Fetch pending POs
        const poResponse = await apiCall('/orders/supply?status=pending,processing,shipped');
        const pendingPOs = poResponse.data || [];
        const pendingCount = pendingPOs.length;
        
        // Fetch suppliers
        const supplierResponse = await apiCall('/suppliers?is_active=true');
        const activeSuppliers = supplierResponse.data || [];
        
        // Fetch reorder suggestions
        const reorderResponse = await apiCall('/inventory/reorder-suggestions');
        const suggestions = reorderResponse.data || [];
        const criticalCount = suggestions.filter(s => s.priority === 'critical').length;
        
        // Calculate budget spent
        const poHistoryResponse = await apiCall('/orders/supply');
        const allPOs = poHistoryResponse.data || [];
        const spentThisMonth = allPOs
            .filter(po => po.status === 'delivered')
            .reduce((sum, po) => sum + (po.total_amount || 0), 0);
        
        const budgetRemaining = budget - spentThisMonth;
        const budgetPercent = (spentThisMonth / budget) * 100;
        
        statsGrid.innerHTML = `
            <div class="stat ${budgetPercent > 80 ? 'stat-warning' : ''}">
                <div class="stat-label">Budget Remaining</div>
                <div class="stat-value">$${budgetRemaining.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <div class="stat-sub">${budgetPercent.toFixed(1)}% used</div>
            </div>
            <div class="stat">
                <div class="stat-label">Pending POs</div>
                <div class="stat-value">${pendingCount}</div>
                <div class="stat-sub">awaiting delivery</div>
            </div>
            <div class="stat">
                <div class="stat-label">Active Suppliers</div>
                <div class="stat-value">${activeSuppliers.length}</div>
                <div class="stat-sub">active partners</div>
            </div>
            <div class="stat ${criticalCount > 0 ? 'stat-warning' : ''}">
                <div class="stat-label">Auto-Reorder Alerts</div>
                <div class="stat-value">${criticalCount}</div>
                <div class="stat-sub">${suggestions.length} total suggestions</div>
            </div>
        `;
        
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        statsGrid.innerHTML = '<div class="error-state">Failed to load statistics</div>';
    }
}

// ============================================
// LOAD REORDER SUGGESTIONS
// ============================================
async function loadReorderSuggestions() {
    const container = document.getElementById('reorderSuggestions');
    if (!container) return;
    
    try {
        const response = await apiCall('/inventory/reorder-suggestions');
        const suggestions = response.data || [];
        const criticalSuggestions = suggestions.filter(s => s.priority === 'critical');
        
        if (criticalSuggestions.length === 0) {
            container.innerHTML = '<div class="empty-state">✅ No critical reorder needs. All stock levels are healthy.</div>';
            return;
        }
        
        container.innerHTML = criticalSuggestions.slice(0, 5).map(item => `
            <div class="reorder-item priority-${item.priority}">
                <div class="reorder-info">
                    <span class="product-name">${escapeHtml(item.name)}</span>
                    <span class="product-sku">${escapeHtml(item.sku)}</span>
                </div>
                <div class="reorder-details">
                    <span class="current-stock">Stock: ${item.current_stock}</span>
                    <span class="suggested-qty">Suggested: ${item.suggested_quantity}</span>
                    <span class="supplier-name">${escapeHtml(item.supplier_name)}</span>
                </div>
                <button class="btn-sm btn-primary" onclick="window.location.href='reorder.html'">Reorder</button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load reorder suggestions:', error);
        container.innerHTML = '<div class="error-state">Failed to load suggestions</div>';
    }
}

// ============================================
// LOAD RECENT PURCHASE ORDERS
// ============================================
async function loadRecentPOs() {
    const container = document.getElementById('recentPOs');
    if (!container) return;
    
    try {
        const response = await apiCall('/orders/supply');
        const orders = response.data || [];
        const recentOrders = orders.slice(0, 5);
        
        if (recentOrders.length === 0) {
            container.innerHTML = '<div class="empty-state">No purchase orders yet. Create your first PO!</div>';
            return;
        }
        
        container.innerHTML = recentOrders.map(order => `
            <div class="po-item">
                <div class="po-info">
                    <span class="po-number">${escapeHtml(order.po_number)}</span>
                    <span class="po-supplier">${escapeHtml(order.supplier_name || 'Supplier ID: ' + order.supplier_id)}</span>
                </div>
                <div class="po-status">
                    <span class="status-badge status-${order.status}">${order.status}</span>
                    <span class="po-amount">$${(order.total_amount || 0).toFixed(2)}</span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load recent POs:', error);
        container.innerHTML = '<div class="error-state">Failed to load POs</div>';
    }
}

// ============================================
// LOAD BUDGET UTILIZATION
// ============================================
async function loadBudgetUtilization() {
    const container = document.getElementById('budgetUtilization');
    if (!container) return;
    
    try {
        const user = auth.getCurrentUser();
        const budget = user.purchase_budget || 100000;
        
        // Get current month's spending
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        
        const response = await apiCall('/orders/supply');
        const orders = response.data || [];
        
        const thisMonthSpending = orders
            .filter(order => order.status === 'delivered' && order.order_date >= startOfMonth)
            .reduce((sum, order) => sum + (order.total_amount || 0), 0);
        
        const percentUsed = (thisMonthSpending / budget) * 100;
        
        let statusClass = '';
        let statusText = '';
        if (percentUsed >= 90) {
            statusClass = 'danger';
            statusText = 'Critical - Budget nearly exhausted';
        } else if (percentUsed >= 75) {
            statusClass = 'warning';
            statusText = 'Warning - Approaching budget limit';
        } else if (percentUsed >= 50) {
            statusClass = 'info';
            statusText = 'Moderate - On track';
        } else {
            statusClass = 'success';
            statusText = 'Good - Healthy budget remaining';
        }
        
        container.innerHTML = `
            <div class="budget-bar-container">
                <div class="budget-bar-fill ${statusClass}" style="width: ${Math.min(100, percentUsed)}%"></div>
            </div>
            <div class="budget-details">
                <div class="budget-item">
                    <span class="budget-label">Total Budget:</span>
                    <span class="budget-value">$${budget.toLocaleString()}</span>
                </div>
                <div class="budget-item">
                    <span class="budget-label">Spent (This Month):</span>
                    <span class="budget-value spent">$${thisMonthSpending.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="budget-item">
                    <span class="budget-label">Remaining:</span>
                    <span class="budget-value remaining">$${(budget - thisMonthSpending).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="budget-status ${statusClass}">${statusText}</div>
            </div>
        `;
        
    } catch (error) {
        console.error('Failed to load budget utilization:', error);
        container.innerHTML = '<div class="error-state">Failed to load budget data</div>';
    }
}

// ============================================
// REFRESH DASHBOARD
// ============================================
function refreshDashboard() {
    loadDashboardStats();
    loadReorderSuggestions();
    loadRecentPOs();
    loadBudgetUtilization();
    showToast('Dashboard refreshed', 'info');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
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

console.log('✅ Supply Dashboard module loaded');