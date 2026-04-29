// frontend/js/sales-orders.js

// ============================================
// GLOBAL VARIABLES
// ============================================
let allOrders = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentFilters = {
    status: '',
    customer_name: '',
    start_date: '',
    end_date: ''
};

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Sales Orders page loading...');
    
    // Check authentication and role
    if (!auth.isLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }
    
    if (!auth.hasRole(['sales', 'admin'])) {
        alert('Access denied. Sales privileges required.');
        auth.logout();
        return;
    }
    
    // Initialize header and sidebar
    new Header('appHeader');
    new Sidebar('sidebar', 'orders');
    
    // Load orders
    await loadOrders();
    
    // Setup event listeners
    setupEventListeners();
});

// ============================================
// LOAD ORDERS FROM API
// ============================================
async function loadOrders() {
    const container = document.getElementById('ordersTableContainer');
    if (container) {
        container.innerHTML = '<div class="loading-state">Loading orders...</div>';
    }
    
    try {
        // Build query string
        let query = '/orders/sales?';
        if (currentFilters.status) {
            query += `status=${encodeURIComponent(currentFilters.status)}&`;
        }
        if (currentFilters.customer_name) {
            query += `customer_name=${encodeURIComponent(currentFilters.customer_name)}&`;
        }
        
        const response = await apiCall(query);
        allOrders = response.data || [];
        
        // Apply date filters client-side
        if (currentFilters.start_date) {
            const startDate = new Date(currentFilters.start_date);
            allOrders = allOrders.filter(order => new Date(order.created_at) >= startDate);
        }
        if (currentFilters.end_date) {
            const endDate = new Date(currentFilters.end_date);
            endDate.setHours(23, 59, 59);
            allOrders = allOrders.filter(order => new Date(order.created_at) <= endDate);
        }
        
        // Sort by date descending (newest first)
        allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        displayOrders();
        
        console.log(`Loaded ${allOrders.length} orders`);
        
    } catch (error) {
        console.error('Failed to load orders:', error);
        if (container) {
            container.innerHTML = '<div class="error-state">Failed to load orders. Please refresh.</div>';
        }
    }
}

// ============================================
// DISPLAY ORDERS IN TABLE
// ============================================
function displayOrders() {
    const container = document.getElementById('ordersTableContainer');
    if (!container) return;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageOrders = allOrders.slice(start, end);
    const totalPages = Math.ceil(allOrders.length / itemsPerPage);
    
    if (pageOrders.length === 0) {
        container.innerHTML = '<div class="empty-orders">No orders found. Create your first order from the dashboard.</div>';
        updatePagination(0, 0);
        return;
    }
    
    const tableHtml = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Payment</th>
                </tr>
            </thead>
            <tbody>
                ${pageOrders.map(order => `
                    <tr onclick="viewOrderDetails(${order.id})">
                        <td><strong>${escapeHtml(order.order_number)}</strong></td>
                        <td>${formatDate(order.created_at)}</td>
                        <td>${escapeHtml(order.customer_name)}</td>
                        <td>$${parseFloat(order.total_amount).toFixed(2)}</td>
                        <td><span class="status-badge status-${order.status}">${formatStatus(order.status)}</span></td>
                        <td><span class="payment-status payment-${order.payment_status}">${formatPaymentStatus(order.payment_status)}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHtml;
    updatePagination(currentPage, totalPages);
}

// ============================================
// VIEW ORDER DETAILS
// ============================================
async function viewOrderDetails(orderId) {
    const modal = document.getElementById('orderDetailsModal');
    const contentContainer = document.getElementById('orderDetailsContent');
    
    if (!modal || !contentContainer) return;
    
    modal.style.display = 'flex';
    contentContainer.innerHTML = '<div class="loading-state">Loading order details...</div>';
    
    try {
        const response = await apiCall(`/orders/sales/${orderId}`);
        const order = response.data;
        
        // Store current order for printing
        window.currentOrder = order;
        
        // Calculate item totals
        const items = order.items || [];
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const discountAmount = order.discount_amount || 0;
        const tax = order.tax || 0;
        const shippingCost = order.shipping_cost || 0;
        const total = order.total_amount || (subtotal - discountAmount + tax + shippingCost);
        
        contentContainer.innerHTML = `
            <!-- Order Info Grid -->
            <div class="order-details-grid">
                <div class="order-info-card">
                    <h4>Order Information</h4>
                    <p><strong>Order Number:</strong> ${escapeHtml(order.order_number)}</p>
                    <p><strong>Date:</strong> ${formatDate(order.created_at)}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${formatStatus(order.status)}</span></p>
                    <p><strong>Payment:</strong> <span class="payment-status payment-${order.payment_status}">${formatPaymentStatus(order.payment_status)}</span></p>
                    <p><strong>Delivery Type:</strong> ${order.delivery_type === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}</p>
                </div>
                
                <div class="order-info-card">
                    <h4>Customer Information</h4>
                    <p><strong>Name:</strong> ${escapeHtml(order.customer_name)}</p>
                    ${order.customer_email ? `<p><strong>Email:</strong> ${escapeHtml(order.customer_email)}</p>` : ''}
                    ${order.customer_phone ? `<p><strong>Phone:</strong> ${escapeHtml(order.customer_phone)}</p>` : ''}
                    ${order.shipping_address ? `<p><strong>Address:</strong> ${escapeHtml(order.shipping_address)}</p>` : ''}
                </div>
            </div>
            
            <!-- Order Items -->
            <h4 style="margin: 20px 0 12px;">Order Items</h4>
            <table class="order-items-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>${escapeHtml(item.product_name || 'Product ID: ' + item.product_id)}</td>
                            <td>${escapeHtml(item.sku || '—')}</td>
                            <td>${item.quantity}</td>
                            <td>$${parseFloat(item.unit_price).toFixed(2)}</td>
                            <td>$${(item.quantity * item.unit_price).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <!-- Order Totals -->
            <div class="order-total">
                <p>Subtotal: $${subtotal.toFixed(2)}</p>
                ${discountAmount > 0 ? `<p>Discount: -$${discountAmount.toFixed(2)}</p>` : ''}
                ${tax > 0 ? `<p>Tax: $${tax.toFixed(2)}</p>` : ''}
                ${shippingCost > 0 ? `<p>Shipping: $${shippingCost.toFixed(2)}</p>` : ''}
                <p style="font-size: 1.125rem; margin-top: 12px;"><strong>Total: $${total.toFixed(2)}</strong></p>
            </div>
        `;
        
    } catch (error) {
        console.error('Failed to load order details:', error);
        contentContainer.innerHTML = '<div class="error-state">Failed to load order details. Please try again.</div>';
    }
}

// ============================================
// CLOSE ORDER DETAILS MODAL
// ============================================
function closeOrderDetailsModal() {
    const modal = document.getElementById('orderDetailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
    window.currentOrder = null;
}

// ============================================
// PRINT ORDER
// ============================================
function printOrder() {
    if (!window.currentOrder) {
        showToast('No order selected', 'error');
        return;
    }
    
    const order = window.currentOrder;
    const items = order.items || [];
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const discountAmount = order.discount_amount || 0;
    const total = order.total_amount || subtotal - discountAmount;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice ${order.order_number}</title>
            <style>
                body {
                    font-family: 'DM Sans', Arial, sans-serif;
                    margin: 40px;
                    color: #1a1917;
                }
                .invoice-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e2e0d8;
                }
                .invoice-header h1 {
                    margin: 0;
                    font-size: 24px;
                }
                .invoice-header p {
                    color: #6b6860;
                    margin: 5px 0 0;
                }
                .order-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 30px;
                }
                .info-box {
                    flex: 1;
                }
                .info-box h3 {
                    font-size: 14px;
                    margin-bottom: 8px;
                    color: #6b6860;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                th, td {
                    padding: 10px;
                    text-align: left;
                    border-bottom: 1px solid #e2e0d8;
                }
                th {
                    background: #f7f6f3;
                }
                .totals {
                    text-align: right;
                    margin-top: 20px;
                }
                .footer {
                    margin-top: 50px;
                    text-align: center;
                    font-size: 12px;
                    color: #6b6860;
                    border-top: 1px solid #e2e0d8;
                    padding-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="invoice-header">
                <h1>INVOICE</h1>
                <p>Order #${order.order_number}</p>
            </div>
            
            <div class="order-info">
                <div class="info-box">
                    <h3>ORDER DETAILS</h3>
                    <p>Date: ${formatDate(order.created_at)}</p>
                    <p>Status: ${formatStatus(order.status)}</p>
                    <p>Delivery: ${order.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}</p>
                </div>
                <div class="info-box">
                    <h3>CUSTOMER DETAILS</h3>
                    <p>Name: ${escapeHtml(order.customer_name)}</p>
                    ${order.customer_email ? `<p>Email: ${escapeHtml(order.customer_email)}</p>` : ''}
                    ${order.customer_phone ? `<p>Phone: ${escapeHtml(order.customer_phone)}</p>` : ''}
                    ${order.shipping_address ? `<p>Address: ${escapeHtml(order.shipping_address)}</p>` : ''}
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>${escapeHtml(item.product_name || 'Product ID: ' + item.product_id)}</td>
                            <td>${item.quantity}</td>
                            <td>$${parseFloat(item.unit_price).toFixed(2)}</td>
                            <td>$${(item.quantity * item.unit_price).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="totals">
                <p>Subtotal: $${subtotal.toFixed(2)}</p>
                ${discountAmount > 0 ? `<p>Discount: -$${discountAmount.toFixed(2)}</p>` : ''}
                <p><strong>Total: $${total.toFixed(2)}</strong></p>
            </div>
            
            <div class="footer">
                <p>Thank you for your business!</p>
                <p>Inventory Management System</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ============================================
// APPLY FILTERS
// ============================================
function applyFilters() {
    currentFilters = {
        status: document.getElementById('statusFilter')?.value || '',
        customer_name: document.getElementById('customerFilter')?.value || '',
        start_date: document.getElementById('startDateFilter')?.value || '',
        end_date: document.getElementById('endDateFilter')?.value || ''
    };
    currentPage = 1;
    loadOrders();
}

// ============================================
// RESET FILTERS
// ============================================
function resetFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const customerFilter = document.getElementById('customerFilter');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    
    if (statusFilter) statusFilter.value = '';
    if (customerFilter) customerFilter.value = '';
    if (startDateFilter) startDateFilter.value = '';
    if (endDateFilter) endDateFilter.value = '';
    
    currentFilters = { status: '', customer_name: '', start_date: '', end_date: '' };
    currentPage = 1;
    loadOrders();
}

// ============================================
// PAGINATION
// ============================================
function goToPage(page) {
    const totalPages = Math.ceil(allOrders.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        displayOrders();
    }
}

function updatePagination(current, total) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    if (total <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    for (let i = 1; i <= total; i++) {
        html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    pagination.innerHTML = html;
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    const applyBtn = document.getElementById('applyFilters');
    const resetBtn = document.getElementById('resetFilters');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', applyFilters);
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatStatus(status) {
    const statusMap = {
        'pending': 'Pending',
        'processing': 'Processing',
        'ready': 'Ready',
        'in_transit': 'In Transit',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
}

function formatPaymentStatus(status) {
    const statusMap = {
        'pending': 'Pending',
        'paid': 'Paid',
        'failed': 'Failed',
        'refunded': 'Refunded'
    };
    return statusMap[status] || status;
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
window.viewOrderDetails = viewOrderDetails;
window.closeOrderDetailsModal = closeOrderDetailsModal;
window.printOrder = printOrder;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.goToPage = goToPage;

console.log('✅ Sales Orders module loaded');