// frontend/js/warehouse-picklists.js
/**
 * Warehouse Pick Lists Module
 * Handles order picking list generation and fulfillment
 * 
 * @module warehouse-picklists
 */

// ============================================
// GLOBAL VARIABLES
// ============================================
let allOrders = [];
let currentPicklist = null;
let currentStatus = 'pending';

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Warehouse Picklists page loading...');
    
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
    new Sidebar('sidebar', 'picklists');
    
    // Check for orderId in URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    if (orderId) {
        await generatePicklistForOrder(orderId);
    }
    
    // Load pick lists
    await loadPickLists();
    
    // Setup tab switching
    setupTabs();
});

// ============================================
// SETUP TAB SWITCHING
// ============================================
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            currentStatus = tab.dataset.status;
            
            // Update active tab styling
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Reload pick lists with filter
            loadPickLists();
        });
    });
}

// ============================================
// LOAD PICK LISTS (Orders ready for picking)
// ============================================
async function loadPickLists() {
    const container = document.getElementById('picklistsContainer');
    if (!container) return;
    
    try {
        // Fetch orders based on status filter
        let statusFilter = '';
        if (currentStatus === 'pending') {
            statusFilter = 'status=pending,processing';
        } else if (currentStatus === 'picking') {
            statusFilter = 'status=processing';
        } else if (currentStatus === 'completed') {
            statusFilter = 'status=ready,delivered';
        }
        
        const response = await apiCall(`/orders/sales?${statusFilter}`);
        allOrders = response.data || [];
        
        document.getElementById('picklistCount').textContent = `${allOrders.length} lists`;
        
        if (allOrders.length === 0) {
            container.innerHTML = '<div class="empty-state">No pick lists found</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="picklists-table">
                <thead>
                    <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${allOrders.map(order => `
                        <tr>
                            <td><strong>${escapeHtml(order.order_number)}</strong></td>
                            <td>${escapeHtml(order.customer_name)}</td>
                            <td>${order.items?.length || 0} item(s)</td>
                            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                            <td>${formatDate(order.created_at)}</td>
                            <td>
                                <button class="btn-sm btn-primary" onclick="viewPicklist(${order.id})">View</button>
                                ${order.status !== 'ready' && order.status !== 'delivered' ? 
                                    `<button class="btn-sm btn-success" onclick="markAsPicked(${order.id})">Mark Picked</button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Failed to load pick lists:', error);
        container.innerHTML = '<div class="error-state">Failed to load pick lists</div>';
    }
}

// ============================================
// GENERATE PICKLIST FOR SPECIFIC ORDER
// ============================================
async function generatePicklistForOrder(orderId) {
    try {
        const response = await apiCall(`/orders/sales/${orderId}`);
        const order = response.data;
        
        if (!order) {
            showToast('Order not found', 'error');
            return;
        }
        
        // Show picklist modal with order details
        await viewPicklist(orderId);
        
    } catch (error) {
        console.error('Failed to generate picklist:', error);
        showToast('Failed to generate picklist', 'error');
    }
}

// ============================================
// VIEW PICKLIST DETAILS
// ============================================
async function viewPicklist(orderId) {
    try {
        const response = await apiCall(`/orders/sales/${orderId}`);
        const order = response.data;
        currentPicklist = order;
        
        const items = order.items || [];
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        
        const modalContent = document.getElementById('picklistDetailContent');
        modalContent.innerHTML = `
            <div class="picklist-header">
                <h3>Pick List #${escapeHtml(order.order_number)}</h3>
                <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="picklist-info">
                <div class="info-group">
                    <strong>Customer:</strong> ${escapeHtml(order.customer_name)}
                </div>
                <div class="info-group">
                    <strong>Delivery Type:</strong> ${order.delivery_type === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}
                </div>
                ${order.shipping_address ? `
                <div class="info-group">
                    <strong>Shipping Address:</strong> ${escapeHtml(order.shipping_address)}
                </div>
                ` : ''}
            </div>
            
            <h4>Items to Pick (${totalItems} total units)</h4>
            <table class="picklist-items-table">
                <thead>
                    <tr>
                        <th>Location</th>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Qty</th>
                        <th>Picked</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((item, index) => `
                        <tr data-item-index="${index}">
                            <td class="location-cell" id="location-${index}">
                                <span class="location-placeholder">—</span>
                                <button class="btn-icon btn-locate" onclick="locateProduct(${item.product_id}, ${index})" title="Find Location">📍</button>
                            </td>
                            <td>${escapeHtml(item.product_name || 'Product ID: ' + item.product_id)}</td>
                            <td>${escapeHtml(item.sku || '—')}</td>
                            <td>${item.quantity}</td>
                            <td>
                                <input type="checkbox" class="picked-checkbox" data-item-index="${index}" onchange="updatePickProgress()">
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="pick-progress">
                <div class="progress-label">Pick Progress:</div>
                <div class="progress-bar">
                    <div class="progress-fill" id="pickProgressFill" style="width: 0%"></div>
                </div>
                <div class="progress-text" id="pickProgressText">0/${totalItems} items picked</div>
            </div>
        `;
        
        document.getElementById('markCompleteBtn').style.display = order.status === 'ready' ? 'none' : 'block';
        document.getElementById('picklistModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Failed to load picklist:', error);
        showToast('Failed to load picklist details', 'error');
    }
}

// ============================================
// LOCATE PRODUCT (Show location info)
// ============================================
async function locateProduct(productId, index) {
    try {
        const user = auth.getCurrentUser();
        const warehouseId = user.warehouse_id || 1;
        
        const response = await apiCall(`/products/${productId}`);
        const product = response.data;
        
        const inventory = product.inventory || [];
        const warehouseInventory = inventory.find(i => i.warehouse_id === warehouseId);
        
        let locationHtml = '<span class="location-not-found">Location not found</span>';
        
        if (warehouseInventory && warehouseInventory.locations && warehouseInventory.locations.length > 0) {
            const loc = warehouseInventory.locations[0];
            locationHtml = `
                <span class="location-found">
                    Aisle ${loc.aisle_number} | ${loc.side} Side | Shelf ${loc.shelf_number} | ${loc.layer} Layer
                </span>
            `;
        } else if (warehouseInventory) {
            locationHtml = `<span class="location-warning">No bin location assigned. Quantity: ${warehouseInventory.quantity}</span>`;
        }
        
        const locationCell = document.getElementById(`location-${index}`);
        if (locationCell) {
            locationCell.innerHTML = locationHtml;
        }
        
        showToast(`Location information loaded`, 'info');
        
    } catch (error) {
        console.error('Failed to locate product:', error);
        showToast('Failed to load location information', 'error');
    }
}

// ============================================
// UPDATE PICK PROGRESS
// ============================================
function updatePickProgress() {
    if (!currentPicklist) return;
    
    const checkboxes = document.querySelectorAll('.picked-checkbox');
    const totalItems = currentPicklist.items?.length || 0;
    const pickedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    const progressPercent = totalItems > 0 ? (pickedCount / totalItems) * 100 : 0;
    
    const progressFill = document.getElementById('pickProgressFill');
    const progressText = document.getElementById('pickProgressText');
    
    if (progressFill) progressFill.style.width = `${progressPercent}%`;
    if (progressText) progressText.textContent = `${pickedCount}/${totalItems} items picked`;
}

// ============================================
// MARK AS PICKED (Update order status)
// ============================================
async function markAsPicked(orderId) {
    if (!confirm('Mark this order as picked and ready for dispatch?')) return;
    
    try {
        await apiCall(`/orders/sales/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'ready' })
        });
        
        showToast('Order marked as ready for dispatch', 'success');
        closePicklistModal();
        await loadPickLists();
        
    } catch (error) {
        console.error('Failed to update order status:', error);
        showToast('Failed to update order status', 'error');
    }
}

// ============================================
// MARK PICKLIST AS COMPLETE
// ============================================
function markPicklistComplete() {
    if (currentPicklist) {
        markAsPicked(currentPicklist.id);
    }
}

// ============================================
// GENERATE NEW PICK LIST
// ============================================
async function generatePickList() {
    try {
        const response = await apiCall('/orders/sales?status=pending,processing');
        const pendingOrders = response.data || [];
        
        if (pendingOrders.length === 0) {
            showToast('No pending orders to generate pick lists', 'info');
            return;
        }
        
        // Show order selection modal
        const orderList = pendingOrders.map(order => 
            `<option value="${order.id}">${order.order_number} - ${order.customer_name}</option>`
        ).join('');
        
        const modalHtml = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2>Select Order</h2>
                    <button class="close-btn" onclick="closeOrderSelectModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Choose an order to pick:</label>
                        <select id="orderSelect" class="order-select">
                            ${orderList}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="closeOrderSelectModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="generateFromSelectedOrder()">Generate Pick List</button>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.id = 'orderSelectModal';
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Failed to generate pick list:', error);
        showToast('Failed to generate pick list', 'error');
    }
}

function closeOrderSelectModal() {
    const modal = document.getElementById('orderSelectModal');
    if (modal) modal.remove();
}

function generateFromSelectedOrder() {
    const orderSelect = document.getElementById('orderSelect');
    const orderId = orderSelect?.value;
    
    if (orderId) {
        closeOrderSelectModal();
        generatePicklistForOrder(orderId);
    } else {
        showToast('Please select an order', 'error');
    }
}

// ============================================
// CLOSE PICKLIST MODAL
// ============================================
function closePicklistModal() {
    document.getElementById('picklistModal').style.display = 'none';
    currentPicklist = null;
}

// ============================================
// PRINT PICKLIST
// ============================================
function printPicklist() {
    if (!currentPicklist) return;
    
    const printContent = document.getElementById('picklistDetailContent').cloneNode(true);
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Pick List ${currentPicklist.order_number}</title>
            <style>
                body {
                    font-family: 'DM Sans', Arial, sans-serif;
                    margin: 40px;
                    color: #1a1917;
                }
                .picklist-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e2e0d8;
                }
                .picklist-info {
                    margin-bottom: 20px;
                    padding: 16px;
                    background: #f7f6f3;
                    border-radius: 8px;
                }
                .info-group {
                    margin-bottom: 8px;
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
                .checkbox-column {
                    text-align: center;
                }
                @media print {
                    .btn-icon, .btn-locate, .picked-checkbox {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            ${printContent.innerHTML}
            <div class="footer">
                <p>Generated: ${new Date().toLocaleString()}</p>
                <p>Picked by: ___________________</p>
                <p>Verified by: ___________________</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
window.viewPicklist = viewPicklist;
window.closePicklistModal = closePicklistModal;
window.printPicklist = printPicklist;
window.markPicklistComplete = markPicklistComplete;
window.generatePickList = generatePickList;
window.locateProduct = locateProduct;
window.updatePickProgress = updatePickProgress;
window.closeOrderSelectModal = closeOrderSelectModal;
window.generateFromSelectedOrder = generateFromSelectedOrder;

console.log('✅ Warehouse Picklists module loaded');