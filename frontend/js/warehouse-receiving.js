// frontend/js/warehouse-receiving.js
/**
 * Warehouse Receiving Module
 * Handles processing incoming purchase orders and receiving stock
 * 
 * @module warehouse-receiving
 */

// ============================================
// GLOBAL VARIABLES
// ============================================
let currentReceiveOrder = null;
let warehousesList = [];

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Warehouse Receiving page loading...');
    
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
    new Sidebar('sidebar', 'receiving');
    
    // Load warehouses for dropdown
    await loadWarehouses();
    
    // Load pending deliveries
    await loadPendingDeliveries();
});

// ============================================
// LOAD WAREHOUSES FOR DROPDOWN
// ============================================
async function loadWarehouses() {
    try {
        const response = await apiCall('/warehouses?is_active=true');
        warehousesList = response.data || [];
        
        const warehouseSelect = document.getElementById('receiveWarehouse');
        if (warehouseSelect) {
            warehouseSelect.innerHTML = '<option value="">Select Warehouse</option>' +
                warehousesList.map(w => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('');
        }
    } catch (error) {
        console.error('Failed to load warehouses:', error);
        showToast('Failed to load warehouses', 'error');
    }
}

// ============================================
// LOAD PENDING DELIVERIES (Supply Orders)
// ============================================
async function loadPendingDeliveries() {
    const container = document.getElementById('pendingDeliveries');
    if (!container) return;
    
    try {
        const response = await apiCall('/orders/supply?status=pending,processing,shipped');
        const orders = response.data || [];
        const pendingOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
        
        const pendingCount = document.getElementById('pendingCount');
        if (pendingCount) pendingCount.textContent = `${pendingOrders.length} pending`;
        
        if (pendingOrders.length === 0) {
            container.innerHTML = '<div class="empty-state">✅ No pending deliveries. All caught up!</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="deliveries-table">
                <thead>
                    <tr>
                        <th>PO Number</th>
                        <th>Supplier</th>
                        <th>Expected Date</th>
                        <th>Status</th>
                        <th>Items</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${pendingOrders.map(order => `
                        <tr>
                            <td><strong>${escapeHtml(order.po_number)}</strong></td>
                            <td>${escapeHtml(order.supplier_name || 'Supplier ID: ' + order.supplier_id)}</td>
                            <td>${order.expected_delivery ? new Date(order.expected_delivery).toLocaleDateString() : '—'}</td>
                            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                            <td>${order.items?.length || 0} item(s)</td>
                            <td>
                                <button class="btn-sm btn-primary" onclick="openReceivingForm(${order.id})">
                                    Receive
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Failed to load pending deliveries:', error);
        container.innerHTML = '<div class="error-state">Failed to load deliveries. Please refresh.</div>';
    }
}

// ============================================
// OPEN RECEIVING FORM FOR A PURCHASE ORDER
// ============================================
async function openReceivingForm(orderId) {
    try {
        const response = await apiCall(`/orders/supply/${orderId}`);
        currentReceiveOrder = response.data;
        
        if (!currentReceiveOrder) {
            showToast('Order not found', 'error');
            return;
        }
        
        // Populate receiving form
        document.getElementById('receiveOrderId').value = currentReceiveOrder.id;
        document.getElementById('receivePoNumber').value = currentReceiveOrder.po_number;
        document.getElementById('receivePoNumberDisplay').textContent = currentReceiveOrder.po_number;
        document.getElementById('receiveSupplier').textContent = currentReceiveOrder.supplier_name || `Supplier ID: ${currentReceiveOrder.supplier_id}`;
        document.getElementById('receiveExpectedDate').textContent = currentReceiveOrder.expected_delivery ? 
            new Date(currentReceiveOrder.expected_delivery).toLocaleDateString() : 'Not specified';
        
        // Render items list with quantity inputs
        const items = currentReceiveOrder.items || [];
        const itemsContainer = document.getElementById('receiveItemsList');
        
        if (items.length === 0) {
            itemsContainer.innerHTML = '<div class="empty-state">No items in this order</div>';
        } else {
            itemsContainer.innerHTML = items.map(item => `
                <div class="receive-item">
                    <div class="receive-item-info">
                        <span class="item-name">${escapeHtml(item.product_name || 'Product ID: ' + item.product_id)}</span>
                        <span class="item-ordered">Ordered: ${item.quantity}</span>
                    </div>
                    <div class="receive-item-qty">
                        <label>Receiving Quantity:</label>
                        <input type="number" class="receive-qty-input" data-product-id="${item.product_id}" 
                               value="${item.quantity}" min="0" max="${item.quantity}" step="1">
                        <label class="defect-label">
                            <input type="checkbox" class="defect-checkbox" data-product-id="${item.product_id}">
                            Report Defects
                        </label>
                    </div>
                    <div class="defect-reason" id="defect-reason-${item.product_id}" style="display:none;">
                        <input type="text" placeholder="Reason for defect (damaged, wrong item, etc.)" 
                               class="defect-reason-input" data-product-id="${item.product_id}">
                    </div>
                </div>
            `).join('');
            
            // Add event listeners for defect checkboxes
            document.querySelectorAll('.defect-checkbox').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const productId = e.target.dataset.productId;
                    const defectDiv = document.getElementById(`defect-reason-${productId}`);
                    if (defectDiv) {
                        defectDiv.style.display = e.target.checked ? 'block' : 'none';
                    }
                });
            });
        }
        
        // Reset form fields
        document.getElementById('receiveWarehouse').value = '';
        document.getElementById('receiveAisle').value = '';
        document.getElementById('receiveShelf').value = '';
        document.getElementById('receiveSide').value = 'left';
        document.getElementById('receiveLayer').value = 'top';
        document.getElementById('receiveNotes').value = '';
        
        // Show the receiving form card
        document.getElementById('receivingFormCard').style.display = 'block';
        
        // Scroll to form
        document.getElementById('receivingFormCard').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Failed to load order details:', error);
        showToast('Failed to load order details', 'error');
    }
}

// ============================================
// CLOSE RECEIVING FORM
// ============================================
function closeReceivingForm() {
    document.getElementById('receivingFormCard').style.display = 'none';
    currentReceiveOrder = null;
}

// ============================================
// SUBMIT RECEIVED STOCK
// ============================================
async function submitReceiveStock() {
    if (!currentReceiveOrder) {
        showToast('No order selected', 'error');
        return;
    }
    
    const warehouseId = document.getElementById('receiveWarehouse').value;
    if (!warehouseId) {
        showToast('Please select a warehouse', 'error');
        return;
    }
    
    // Collect receiving quantities and defects
    const receivedItems = [];
    const defectItems = [];
    
    const qtyInputs = document.querySelectorAll('.receive-qty-input');
    for (const input of qtyInputs) {
        const productId = parseInt(input.dataset.productId);
        const quantity = parseInt(input.value);
        
        if (quantity > 0) {
            receivedItems.push({
                product_id: productId,
                quantity: quantity
            });
        }
        
        // Check for defects
        const defectCheckbox = document.querySelector(`.defect-checkbox[data-product-id="${productId}"]`);
        if (defectCheckbox && defectCheckbox.checked) {
            const defectReason = document.querySelector(`.defect-reason-input[data-product-id="${productId}"]`)?.value || 'No reason provided';
            defectItems.push({
                product_id: productId,
                reason: defectReason
            });
        }
    }
    
    if (receivedItems.length === 0) {
        showToast('No items to receive', 'error');
        return;
    }
    
    // Prepare location data
    const aisle = document.getElementById('receiveAisle').value;
    const side = document.getElementById('receiveSide').value;
    const shelf = document.getElementById('receiveShelf').value;
    const layer = document.getElementById('receiveLayer').value;
    
    const location = (aisle && shelf) ? {
        aisle_number: parseInt(aisle),
        side: side,
        shelf_number: parseInt(shelf),
        layer: layer
    } : null;
    
    try {
        showToast('Processing received stock...', 'info');
        
        // Process each received item
        for (const item of receivedItems) {
            const receiveData = {
                product_id: item.product_id,
                warehouse_id: parseInt(warehouseId),
                quantity: item.quantity,
                reason: `PO: ${currentReceiveOrder.po_number} - ${currentReceiveOrder.supplier_name}`
            };
            
            await apiCall('/inventory/receive', {
                method: 'POST',
                body: JSON.stringify(receiveData)
            });
        }
        
        // Update order status to delivered
        await apiCall(`/orders/supply/${currentReceiveOrder.id}/receive`, {
            method: 'POST',
            body: JSON.stringify({ warehouse_id: parseInt(warehouseId) })
        });
        
        showToast(`Successfully received ${receivedItems.reduce((sum, i) => sum + i.quantity, 0)} units`, 'success');
        
        // Close form and refresh
        closeReceivingForm();
        await loadPendingDeliveries();
        
    } catch (error) {
        console.error('Failed to receive stock:', error);
        showToast(error.message || 'Failed to receive stock', 'error');
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
window.openReceivingForm = openReceivingForm;
window.closeReceivingForm = closeReceivingForm;
window.submitReceiveStock = submitReceiveStock;

console.log('✅ Warehouse Receiving module loaded');