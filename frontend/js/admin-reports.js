// frontend/js/admin-reports.js


// ============================================
// GLOBAL VARIABLES
// ============================================
let currentReportData = null;
let activeTab = 'sales';

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin Reports page loading...');
    
    // Check authentication and role
    if (!auth.isLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }
    
    if (!auth.hasRole('admin')) {
        alert('Access denied. Admin privileges required.');
        auth.logout();
        return;
    }
    
    // Initialize header and sidebar
    new Header('appHeader');
    new Sidebar('sidebar', 'reports');
    
    // Set default date range (last 30 days)
    setDefaultDateRange();
    
    // Setup tab switching
    setupTabs();
    
    // Load initial report (Sales)
    await loadSalesReport();
    
    // Setup event listeners
    setupEventListeners();
});

// ============================================
// SET DEFAULT DATE RANGE (LAST 30 DAYS)
// ============================================
function setDefaultDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
}

// ============================================
// SETUP TAB SWITCHING
// ============================================
function setupTabs() {
    const tabs = document.querySelectorAll('.report-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const reportType = tab.dataset.tab;
            activeTab = reportType;
            
            // Update active tab styling
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show/hide report panels
            document.getElementById('salesReportPanel').style.display = reportType === 'sales' ? 'block' : 'none';
            document.getElementById('inventoryReportPanel').style.display = reportType === 'inventory' ? 'block' : 'none';
            document.getElementById('supplierReportPanel').style.display = reportType === 'supplier' ? 'block' : 'none';
            
            // Load appropriate report
            if (reportType === 'sales') {
                loadSalesReport();
            } else if (reportType === 'inventory') {
                loadInventoryReport();
            } else if (reportType === 'supplier') {
                loadSupplierReport();
            }
        });
    });
}

// ============================================
// LOAD SALES REPORT
// ============================================
async function loadSalesReport() {
    const loadingIndicator = document.getElementById('salesLoading');
    const contentContainer = document.getElementById('salesReportContent');
    
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (contentContainer) contentContainer.innerHTML = '';
    
    try {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (!startDate || !endDate) {
            showToast('Please select both start and end dates', 'error');
            return;
        }
        
        const response = await apiCall(`/reports/sales?start_date=${startDate}&end_date=${endDate}`);
        currentReportData = response.data;
        
        displaySalesReport(currentReportData);
        
    } catch (error) {
        console.error('Failed to load sales report:', error);
        if (contentContainer) {
            contentContainer.innerHTML = '<div class="error-state">Failed to load sales report. Please try again.</div>';
        }
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

// ============================================
// DISPLAY SALES REPORT
// ============================================
function displaySalesReport(data) {
    const container = document.getElementById('salesReportContent');
    if (!container) return;
    
    const summary = data.summary || {};
    const dailyBreakdown = data.daily_breakdown || [];
    const topProducts = data.top_products || [];
    const categoryBreakdown = data.category_breakdown || [];
    
    container.innerHTML = `
        <!-- Summary Cards -->
        <div class="report-summary-grid">
            <div class="summary-card">
                <div class="summary-label">Total Sales</div>
                <div class="summary-value">$${summary.total_sales?.toFixed(2) || '0.00'}</div>
                <div class="summary-sub">${dailyBreakdown.length} days</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Orders</div>
                <div class="summary-value">${summary.total_orders || 0}</div>
                <div class="summary-sub">orders processed</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Average Order Value</div>
                <div class="summary-value">$${summary.average_order_value?.toFixed(2) || '0.00'}</div>
                <div class="summary-sub">per transaction</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Discounts</div>
                <div class="summary-value">$${summary.total_discounts?.toFixed(2) || '0.00'}</div>
                <div class="summary-sub">given to customers</div>
            </div>
        </div>
        
        <!-- Daily Breakdown Table -->
        <div class="report-section">
            <h4>Daily Sales Breakdown</h4>
            <div class="table-responsive">
                <table class="report-table">
                    <thead>
                        <tr><th>Date</th><th>Orders</th><th>Revenue</th><th>Avg Order</th><th>Discounts</th></tr>
                    </thead>
                    <tbody>
                        ${dailyBreakdown.length > 0 ? dailyBreakdown.map(day => `
                            <tr>
                                <td>${new Date(day.date).toLocaleDateString()}</td>
                                <td>${day.order_count}</td>
                                <td>$${parseFloat(day.total_sales).toFixed(2)}</td>
                                <td>$${parseFloat(day.avg_order_value).toFixed(2)}</td>
                                <td>$${parseFloat(day.total_discounts || 0).toFixed(2)}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" class="empty-state">No sales data for this period</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Top Products -->
        <div class="report-section">
            <h4>Top 10 Products</h4>
            <div class="table-responsive">
                <table class="report-table">
                    <thead>
                        <tr><th>Product</th><th>SKU</th><th>Quantity Sold</th><th>Revenue</th></tr>
                    </thead>
                    <tbody>
                        ${topProducts.length > 0 ? topProducts.map(p => `
                            <tr>
                                <td>${escapeHtml(p.name)}</td>
                                <td>${escapeHtml(p.sku)}</td>
                                <td>${p.total_quantity}</td>
                                <td>$${parseFloat(p.total_revenue).toFixed(2)}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="4" class="empty-state">No product sales data</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Category Breakdown -->
        <div class="report-section">
            <h4>Sales by Category</h4>
            <div class="category-breakdown">
                ${categoryBreakdown.length > 0 ? categoryBreakdown.map(cat => `
                    <div class="category-item">
                        <span class="category-name">${escapeHtml(cat.category || 'Uncategorized')}</span>
                        <span class="category-revenue">$${parseFloat(cat.revenue).toFixed(2)}</span>
                        <div class="category-bar">
                            <div class="category-bar-fill" style="width: ${Math.min(100, (parseFloat(cat.revenue) / (categoryBreakdown[0]?.revenue || 1)) * 100)}%"></div>
                        </div>
                    </div>
                `).join('') : '<p class="empty-state">No category data available</p>'}
            </div>
        </div>
    `;
}

// ============================================
// LOAD INVENTORY REPORT
// ============================================
async function loadInventoryReport() {
    const loadingIndicator = document.getElementById('inventoryLoading');
    const contentContainer = document.getElementById('inventoryReportContent');
    
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (contentContainer) contentContainer.innerHTML = '';
    
    try {
        const response = await apiCall('/reports/inventory');
        const data = response.data;
        
        displayInventoryReport(data);
        
    } catch (error) {
        console.error('Failed to load inventory report:', error);
        if (contentContainer) {
            contentContainer.innerHTML = '<div class="error-state">Failed to load inventory report. Please try again.</div>';
        }
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

// ============================================
// DISPLAY INVENTORY REPORT
// ============================================
function displayInventoryReport(data) {
    const container = document.getElementById('inventoryReportContent');
    if (!container) return;
    
    const totals = data.totals || {};
    const warehouseSummary = data.warehouse_summary || [];
    const lowStockItems = data.low_stock_items || [];
    
    container.innerHTML = `
        <!-- Summary Cards -->
        <div class="report-summary-grid">
            <div class="summary-card">
                <div class="summary-label">Total Inventory Value</div>
                <div class="summary-value">$${totals.total_inventory_value?.toFixed(2) || '0.00'}</div>
                <div class="summary-sub">at selling price</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Inventory Cost</div>
                <div class="summary-value">$${totals.total_inventory_cost?.toFixed(2) || '0.00'}</div>
                <div class="summary-sub">at purchase price</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Units</div>
                <div class="summary-value">${totals.total_units?.toLocaleString() || 0}</div>
                <div class="summary-sub">across all warehouses</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Potential Profit</div>
                <div class="summary-value">$${totals.potential_profit?.toFixed(2) || '0.00'}</div>
                <div class="summary-sub">if all sold at retail</div>
            </div>
        </div>
        
        <!-- Warehouse Summary -->
        <div class="report-section">
            <h4>Warehouse Breakdown</h4>
            <div class="table-responsive">
                <table class="report-table">
                    <thead>
                        <tr><th>Warehouse</th><th>Products</th><th>Units</th><th>Value</th><th>Utilization</th></tr>
                    </thead>
                    <tbody>
                        ${warehouseSummary.length > 0 ? warehouseSummary.map(w => `
                            <tr>
                                <td>${escapeHtml(w.warehouse_name)}</td>
                                <td>${w.unique_products}</td>
                                <td>${w.total_units?.toLocaleString() || 0}</td>
                                <td>$${parseFloat(w.total_value).toFixed(2)}</td>
                                <td>
                                    <div class="utilization-bar-container">
                                        <div class="utilization-bar-fill" style="width: ${Math.min(100, (parseFloat(w.total_units) / (w.capacity || 1)) * 100)}%; background: ${(parseFloat(w.total_units) / (w.capacity || 1)) > 0.8 ? 'var(--warning)' : 'var(--success)'}"></div>
                                    </div>
                                </td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" class="empty-state">No warehouse data available</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Low Stock Alerts -->
        <div class="report-section">
            <h4>Low Stock Alerts (Critical Items)</h4>
            <div class="table-responsive">
                <table class="report-table">
                    <thead>
                        <tr><th>Product</th><th>SKU</th><th>Warehouse</th><th>Current Stock</th><th>Reorder Point</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                        ${lowStockItems.length > 0 ? lowStockItems.map(item => `
                            <tr>
                                <td>${escapeHtml(item.name)}</td>
                                <td>${escapeHtml(item.sku)}</td>
                                <td>${escapeHtml(item.warehouse)}</td>
                                <td class="warning-text">${item.quantity}</td>
                                <td>${item.reorder_point}</td>
                                <td><span class="badge badge-warning">Reorder Needed</span></td>
                            </tr>
                        `).join('') : '<tr><td colspan="6" class="empty-state">No low stock items found</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ============================================
// LOAD SUPPLIER REPORT
// ============================================
async function loadSupplierReport() {
    const loadingIndicator = document.getElementById('supplierLoading');
    const contentContainer = document.getElementById('supplierReportContent');
    
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (contentContainer) contentContainer.innerHTML = '';
    
    try {
        const response = await apiCall('/reports/suppliers');
        const data = response.data;
        
        displaySupplierReport(data);
        
    } catch (error) {
        console.error('Failed to load supplier report:', error);
        if (contentContainer) {
            contentContainer.innerHTML = '<div class="error-state">Failed to load supplier report. Please try again.</div>';
        }
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

// ============================================
// DISPLAY SUPPLIER REPORT
// ============================================
function displaySupplierReport(data) {
    const container = document.getElementById('supplierReportContent');
    if (!container) return;
    
    const suppliers = data.suppliers || [];
    const performanceSummary = data.performance_summary || {};
    
    container.innerHTML = `
        <!-- Summary Cards -->
        <div class="report-summary-grid">
            <div class="summary-card">
                <div class="summary-label">Total Suppliers</div>
                <div class="summary-value">${data.total_suppliers || 0}</div>
                <div class="summary-sub">active partners</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Excellent (95%+)</div>
                <div class="summary-value">${performanceSummary.excellent || 0}</div>
                <div class="summary-sub">on-time delivery</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Good (85-94%)</div>
                <div class="summary-value">${performanceSummary.good || 0}</div>
                <div class="summary-sub">on-time delivery</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Needs Improvement</div>
                <div class="summary-value">${(performanceSummary.average || 0) + (performanceSummary.poor || 0)}</div>
                <div class="summary-sub">below 85%</div>
            </div>
        </div>
        
        <!-- Supplier Performance Table -->
        <div class="report-section">
            <h4>Supplier Performance</h4>
            <div class="table-responsive">
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Supplier</th>
                            <th>Rating</th>
                            <th>On-Time Rate</th>
                            <th>Total Orders</th>
                            <th>Products Supplied</th>
                            <th>Lead Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${suppliers.length > 0 ? suppliers.map(s => {
                            let ratingStars = '';
                            const rating = s.rating || 0;
                            const fullStars = Math.floor(rating);
                            const halfStar = rating % 1 >= 0.5;
                            for (let i = 0; i < fullStars; i++) ratingStars += '★';
                            if (halfStar) ratingStars += '½';
                            for (let i = ratingStars.length; i < 5; i++) ratingStars += '☆';
                            
                            let performanceClass = '';
                            const onTimeRate = s.on_time_rate || 0;
                            if (onTimeRate >= 90) performanceClass = 'badge-success';
                            else if (onTimeRate >= 75) performanceClass = 'badge-warning';
                            else performanceClass = 'badge-danger';
                            
                            return `
                                <tr>
                                    <td>${escapeHtml(s.name)}</td>
                                    <td class="rating-stars">${ratingStars}</td>
                                    <td><span class="badge ${performanceClass}">${onTimeRate.toFixed(0)}%</span></td>
                                    <td>${s.total_orders || 0}</td>
                                    <td>${s.products_supplied || 0}</td>
                                    <td>${s.lead_time_days || 7} days</td>
                                </tr>
                            `;
                        }).join('') : '<tr><td colspan="6" class="empty-state">No supplier data available</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ============================================
// EXPORT CURRENT REPORT TO PDF
// ============================================
async function exportToPDF() {
    showToast('Generating PDF report...', 'info');
    
    try {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        let url = '';
        if (activeTab === 'sales') {
            url = `/reports/sales?start_date=${startDate}&end_date=${endDate}&format=pdf`;
        } else if (activeTab === 'inventory') {
            url = `/reports/inventory?format=pdf`;
        } else if (activeTab === 'supplier') {
            url = `/reports/suppliers?format=pdf`;
        }
        
        // Open PDF in new tab
        window.open(`${CONFIG.API_BASE_URL}${url}`, '_blank');
        showToast('PDF report generated', 'success');
        
    } catch (error) {
        console.error('Failed to export report:', error);
        showToast('Failed to generate PDF', 'error');
    }
}

// ============================================
// REFRESH CURRENT REPORT
// ============================================
function refreshReport() {
    if (activeTab === 'sales') {
        loadSalesReport();
    } else if (activeTab === 'inventory') {
        loadInventoryReport();
    } else if (activeTab === 'supplier') {
        loadSupplierReport();
    }
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    const refreshBtn = document.getElementById('refreshReport');
    const exportBtn = document.getElementById('exportReport');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshReport);
    }
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToPDF);
    }
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
window.exportToPDF = exportToPDF;
window.refreshReport = refreshReport;

console.log('✅ Admin Reports module loaded');