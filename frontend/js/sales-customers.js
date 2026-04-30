// Sales Customers Page JavaScript

// Update header with user info
const user = auth.getCurrentUser();
if (user) {
    document.getElementById('userName').textContent = user.name || 'Sales User';
    document.getElementById('userRole').textContent = user.role || 'sales';
    document.getElementById('sidebarName').textContent = user.name || 'Sales Associate';
    document.getElementById('sidebarRole').textContent = user.role || 'sales';
}

let allCustomers = [];
let selectedCustomer = null;

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&';
        if (m === '<') return '<';
        if (m === '>') return '>';
        return m;
    });
}

function formatDate(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString();
}

async function loadCustomers() {
    const container = document.getElementById('customersTableContainer');
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    try {
        // Get all orders to extract customers
        const response = await fetch(`${CONFIG.API_BASE_URL}/orders/sales`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem(CONFIG.TOKEN_KEY)}` }
        });
        const data = await response.json();
        const orders = data.data || [];
        
        // Extract unique customers
        const customerMap = new Map();
        for (const order of orders) {
            if (!customerMap.has(order.customer_name)) {
                customerMap.set(order.customer_name, {
                    name: order.customer_name,
                    email: order.customer_email,
                    phone: order.customer_phone,
                    total_orders: 1,
                    total_spent: order.total_amount,
                    last_order_date: order.created_at,
                    orders: [order]
                });
            } else {
                const existing = customerMap.get(order.customer_name);
                existing.total_orders++;
                existing.total_spent += order.total_amount;
                existing.orders.push(order);
                // Update last order date if newer
                if (new Date(order.created_at) > new Date(existing.last_order_date)) {
                    existing.last_order_date = order.created_at;
                }
            }
        }
        
        allCustomers = Array.from(customerMap.values());
        
        // Apply search filter
        let filteredCustomers = allCustomers;
        if (searchTerm) {
            filteredCustomers = allCustomers.filter(c => 
                c.name.toLowerCase().includes(searchTerm) ||
                (c.email && c.email.toLowerCase().includes(searchTerm)) ||
                (c.phone && c.phone.includes(searchTerm))
            );
        }
        
        // Sort by total spent descending
        filteredCustomers.sort((a, b) => b.total_spent - a.total_spent);
        
        if (filteredCustomers.length === 0) {
            container.innerHTML = '<div class="empty-state">No customers found. Create orders to build customer history.</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="customers-table">
                <thead>
                    <tr>
                        <th>Customer Name</th>
                        <th>Contact</th>
                        <th>Orders</th>
                        <th>Total Spent</th>
                        <th>Last Order</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredCustomers.map(customer => `
                        <tr onclick="viewCustomerDetails('${escapeHtml(customer.name)}')">
                            <td class="customer-name">${escapeHtml(customer.name)}</td>
                            <td>
                                ${customer.email ? `<div>📧 ${escapeHtml(customer.email)}</div>` : ''}
                                ${customer.phone ? `<div>📞 ${escapeHtml(customer.phone)}</div>` : ''}
                            </td>
                            <td><span class="order-count">${customer.total_orders}</span></td>
                            <td style="font-weight: 600; color: var(--accent);">$${customer.total_spent.toFixed(2)}</td>
                            <td>${formatDate(customer.last_order_date)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Failed to load customers:', error);
        container.innerHTML = '<div class="error-state">Failed to load customers. Please try again.</div>';
    }
}

async function viewCustomerDetails(customerName) {
    const customer = allCustomers.find(c => c.name === customerName);
    if (!customer) return;
    
    selectedCustomer = customer;
    const modal = document.getElementById('customerModal');
    const content = document.getElementById('customerDetailContent');
    const modalTitle = document.getElementById('modalCustomerName');
    
    modalTitle.textContent = customer.name;
    
    // Sort orders by date descending
    const ordersSorted = [...(customer.orders || [])].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
    );
    
    content.innerHTML = `
        <div class="customer-stats">
            <div class="stat-card">
                <div class="stat-value">${customer.total_orders}</div>
                <div class="stat-label">Total Orders</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">$${customer.total_spent.toFixed(2)}</div>
                <div class="stat-label">Total Spent</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">$${(customer.total_spent / customer.total_orders).toFixed(2)}</div>
                <div class="stat-label">Avg Order Value</div>
            </div>
        </div>
        
        <div class="order-history">
            <h4>📋 Order History</h4>
            ${ordersSorted.map(order => `
                <div class="order-item">
                    <div>
                        <div class="order-number">${escapeHtml(order.order_number)}</div>
                        <div class="order-date">${formatDate(order.created_at)}</div>
                    </div>
                    <div class="order-total">$${order.total_amount.toFixed(2)}</div>
                    <div><span class="order-status status-${order.status}">${order.status || 'pending'}</span></div>
                </div>
            `).join('')}
        </div>
    `;
    
    modal.style.display = 'flex';
}

function closeCustomerModal() {
    document.getElementById('customerModal').style.display = 'none';
    selectedCustomer = null;
}

function createNewOrder() {
    if (selectedCustomer) {
        // Store customer info in sessionStorage for checkout
        sessionStorage.setItem('checkout_customer', JSON.stringify({
            name: selectedCustomer.name,
            email: selectedCustomer.email,
            phone: selectedCustomer.phone
        }));
        window.location.href = 'dashboard.html';
    }
}

function applyFilter() {
    loadCustomers();
}

function resetFilter() {
    document.getElementById('searchInput').value = '';
    loadCustomers();
}

// Setup event listeners
document.getElementById('applyFilter')?.addEventListener('click', applyFilter);
document.getElementById('resetFilter')?.addEventListener('click', resetFilter);
document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') applyFilter();
});

// Load customers on page load
loadCustomers();

// Export functions
window.viewCustomerDetails = viewCustomerDetails;
window.closeCustomerModal = closeCustomerModal;
window.createNewOrder = createNewOrder;