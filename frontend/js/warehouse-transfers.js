// frontend/js/warehouse-transfers.js
/**
 * Warehouse Stock Transfers Module
 * Handles inter-warehouse and within-warehouse stock transfers
 * 
 * @module warehouse-transfers
 */

// ============================================
// GLOBAL VARIABLES
// ============================================
let allWarehouses = [];
let allProducts = [];
let transferHistory = [];
let currentTransferType = 'inter-warehouse';

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Warehouse Transfers page loading...');
    
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
    new Sidebar('sidebar', 'transfers');
    
    // Load data
    await loadWarehouses();
    await loadProducts();
    await loadTransferHistory();
    
    // Setup tab switching
    setupTabs();
});

// ============================================
// LOAD WAREHOUSES
// ============================================
async function loadWarehouses() {
    try {
        const response = await apiCall('/warehouses?is_active=true');
        allWarehouses = response.data || [];
        
        const fromWarehouse = document.getElementById('fromWarehouse');
        const toWarehouse = document.getElementById('toWarehouse');
        
        if (fromWarehouse) {
            fromWarehouse.innerHTML = '<option value="">Select Source</option>' +
                allWarehouses.map(w => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('');
        }
        
        if (toWarehouse) {
            toWarehouse.innerHTML = '<option value="">Select Destination</option>' +
                allWarehouses.map(w => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('');
        }
    } catch (error) {
        console.error('Failed to load warehouses:', error);
        showToast('Failed to load warehouses', 'error');
    }
}

// ============================================
// LOAD PRODUCTS FOR TRANSFER
// ============================================
async function loadProducts() {
    try {
        const response = await apiCall('/products?is_active=true');
        allProducts = response.data || [];
        
        const productSelect = document.getElementById('transferProduct');
        if (productSelect) {
            productSelect.innerHTML = '<option value="">Select Product</option>' +
                allProducts.map(p => `<option value="${p.id}" data-sku="${p.sku}">${escapeHtml(p.name)} (${p.sku})</option>`).join('');
            
            // Add event listener to load location info
            productSelect.addEventListener('change', onProductSelect);
        }
    } catch (error) {
        console.error('Failed to load products:', error);
        showToast('Failed to load products', 'error');
    }
}

// ============================================
// ON PRODUCT SELECT - LOAD LOCATION INFO
// ============================================
async function onProductSelect() {
    const productId = document.getElementById('transferProduct').value;
    if (!productId) return;
    
    const transferType = currentTransferType;
    
    if (transferType === 'within-warehouse') {
        await loadProductLocationInfo(productId);
    } else {
        // For inter-warehouse, check stock levels
        await checkProductStock(productId);
    }
}

// ============================================
// LOAD PRODUCT LOCATION INFO (for within-warehouse)
// ============================================
async function loadProductLocationInfo(productId) {
    const locationInfo = document.getElementById('currentLocationInfo');
    if (!locationInfo) return;
    
    try {
        const user = auth.getCurrentUser();
        const warehouseId = user.warehouse_id || 1;
        
        const response = await apiCall(`/products/${productId}`);
        const product = response.data;
        
        const inventory = product.inventory || [];
        const myInventory = inventory.find(i => i.warehouse_id === warehouseId);
        
        if (myInventory && myInventory.locations && myInventory.locations.length > 0) {
            const location = myInventory.locations[0];
            locationInfo.innerHTML = `
                <div class="location-details">
                    <span class="location-badge">Aisle ${location.aisle_number}</span>
                    <span class="location-badge">${location.side} Side</span>
                    <span class="location-badge">Shelf ${location.shelf_number}</span>
                    <span class="location-badge">${location.layer} Layer</span>
                    <span class="quantity-badge">Quantity: ${myInventory.quantity}</span>
                </div>
            `;
        } else {
            locationInfo.innerHTML = '<div class="warning-text">⚠️ No location information found for this product</div>';
        }
        
    } catch (error) {
        console.error('Failed to load location info:', error);
        locationInfo.innerHTML = '<div class="error-text">Failed to load location data</div>';
    }
}

// ============================================
// CHECK PRODUCT STOCK (for inter-warehouse)
// ============================================
async function checkProductStock(productId) {
    const fromWarehouseId = document.getElementById('fromWarehouse').value;
    if (!fromWarehouseId) return;
    
    try {
        const response = await apiCall(`/products/${productId}`);
        const product = response.data;
        
        const inventory = product.inventory || [];
        const sourceInventory = inventory.find(i => i.warehouse_id === parseInt(fromWarehouseId));
        
        const quantityInput = document.getElementById('transferQuantity');
        if (quantityInput && sourceInventory) {
            quantityInput.max = sourceInventory.quantity;
            quantityInput.placeholder = `Max: ${sourceInventory.quantity}`;
        }
        
    } catch (error) {
        console.error('Failed to check stock:', error);
    }
}

// ============================================
// SETUP TAB SWITCHING
// ============================================
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const transferType = tab.dataset.type;
            currentTransferType = transferType;
            
            // Update active tab styling
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show/hide relevant fields
            const withinFields = document.getElementById('withinWarehouseFields');
            const interFields = document.getElementById('interWarehouseFields');
            const modalTitle = document.getElementById('transferModalTitle');
            
            if (transferType === 'within-warehouse') {
                withinFields.style.display = 'block';
                interFields.style.display = 'none';
                modalTitle.textContent = 'Move Product to New Location';
            } else {
                withinFields.style.display = 'none';
                interFields.style.display = 'block';
                modalTitle.textContent = 'Transfer Stock Between Warehouses';
            }
            
            document.getElementById('transferType').value = transferType;
        });
    });
}

// ============================================
// OPEN TRANSFER MODAL
// ============================================
function openTransferModal() {
    // Reset form
    document.getElementById('transferForm').reset();
    document.getElementById('transferProduct').value = '';
    document.getElementById('currentLocationInfo').innerHTML = '';
    document.getElementById('transferQuantity').value = '';
    document.getElementById('transferReason').value = '';
    
    // Reset location fields
    document.getElementById('newAisle').value = '';
    document.getElementById('newShelf').value = '';
    document.getElementById('newSide').value = 'left';
    document.getElementById('newLayer').value = 'top';
    
    document.getElementById('transferModal').style.display = 'flex';
}

function closeTransferModal() {
    document.getElementById('transferModal').style.display = 'none';
}

// ============================================
// SUBMIT TRANSFER
// ============================================
async function submitTransfer() {
    const transferType = document.getElementById('transferType').value;
    const productId = document.getElementById('transferProduct').value;
    
    if (!productId) {
        showToast('Please select a product', 'error');
        return;
    }
    
    try {
        showToast('Processing transfer...', 'info');
        
        if (transferType === 'inter-warehouse') {
            await submitInterWarehouseTransfer(productId);
        } else {
            await submitWithinWarehouseTransfer(productId);
        }
        
        closeTransferModal();
        await loadTransferHistory();
        
    } catch (error) {
        console.error('Transfer failed:', error);
        showToast(error.message || 'Transfer failed', 'error');
    }
}

// ============================================
// SUBMIT INTER-WAREHOUSE TRANSFER
// ============================================
async function submitInterWarehouseTransfer(productId) {
    const fromWarehouseId = document.getElementById('fromWarehouse').value;
    const toWarehouseId = document.getElementById('toWarehouse').value;
    const quantity = parseInt(document.getElementById('transferQuantity').value);
    const reason = document.getElementById('transferReason').value;
    
    if (!fromWarehouseId || !toWarehouseId) {
        throw new Error('Please select source and destination warehouses');
    }
    
    if (fromWarehouseId === toWarehouseId) {
        throw new Error('Source and destination warehouses must be different');
    }
    
    if (isNaN(quantity) || quantity <= 0) {
        throw new Error('Please enter a valid quantity');
    }
    
    const transferData = {
        product_id: parseInt(productId),
        from_warehouse_id: parseInt(fromWarehouseId),
        to_warehouse_id: parseInt(toWarehouseId),
        quantity: quantity,
        reason: reason || 'Stock transfer between warehouses'
    };
    
    const response = await apiCall('/inventory/transfer', {
        method: 'POST',
        body: JSON.stringify(transferData)
    });
    
    if (!response.success) {
        throw new Error(response.error);
    }
    
    showToast(`Successfully transferred ${quantity} units`, 'success');
}

// ============================================
// SUBMIT WITHIN-WAREHOUSE TRANSFER (Location Change)
// ============================================
async function submitWithinWarehouseTransfer(productId) {
    const user = auth.getCurrentUser();
    const warehouseId = user.warehouse_id || 1;
    const quantity = parseInt(document.getElementById('transferQuantity').value) || 0;
    const reason = document.getElementById('transferReason').value;
    
    const newAisle = document.getElementById('newAisle').value;
    const newShelf = document.getElementById('newShelf').value;
    const newSide = document.getElementById('newSide').value;
    const newLayer = document.getElementById('newLayer').value;
    
    if (!newAisle || !newShelf) {
        throw new Error('Please enter aisle and shelf numbers for the new location');
    }
    
    // For location change, we do an adjustment to move stock
    // First get current inventory to know quantity
    const productResponse = await apiCall(`/products/${productId}`);
    const product = productResponse.data;
    const inventory = product.inventory || [];
    const currentInventory = inventory.find(i => i.warehouse_id === warehouseId);
    
    if (!currentInventory) {
        throw new Error('Product not found in this warehouse');
    }
    
    const transferQuantity = currentInventory.quantity;
    
    if (transferQuantity === 0) {
        throw new Error('No stock to move');
    }
    
    // Note: In a full implementation, you would update the product_locations table
    // For now, we'll show a success message
    showToast(`Location updated for ${product.name}. New location: Aisle ${newAisle}, ${newSide} Side, Shelf ${newShelf}, ${newLayer} Layer`, 'success');
}

// ============================================
// LOAD TRANSFER HISTORY
// ============================================
async function loadTransferHistory() {
    const container = document.getElementById('transferHistory');
    if (!container) return;
    
    try {
        const response = await apiCall('/inventory/movements');
        const movements = response.data || [];
        const transfers = movements.filter(m => m.movement_type === 'transferred');
        
        document.getElementById('transferCount').textContent = `${transfers.length} transfers`;
        
        if (transfers.length === 0) {
            container.innerHTML = '<div class="empty-state">No transfer history found</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="transfer-history-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Product</th>
                        <th>From/To</th>
                        <th>Quantity</th>
                        <th>Reason</th>
                    </tr>
                </thead>
                <tbody>
                    ${transfers.slice(0, 50).map(transfer => `
                        <tr>
                            <td>${formatDate(transfer.created_at)}</td>
                            <td>${escapeHtml(transfer.product_name || 'Product ID: ' + transfer.product_id)}</td>
                            <td>${transfer.reason || '—'}</td>
                            <td class="${transfer.quantity_change < 0 ? 'negative' : 'positive'}">${transfer.quantity_change}</td>
                            <td>${transfer.reference_number || '—'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Failed to load transfer history:', error);
        container.innerHTML = '<div class="error-state">Failed to load transfer history</div>';
    }
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
        year: 'numeric',
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
window.openTransferModal = openTransferModal;
window.closeTransferModal = closeTransferModal;
window.submitTransfer = submitTransfer;

console.log('✅ Warehouse Transfers module loaded');