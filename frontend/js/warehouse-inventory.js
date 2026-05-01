// frontend/js/warehouse-inventory.js


// ============================================
// GLOBAL VARIABLES
// ============================================
let inventoryTable = null;
let allInventory = [];
let currentAdjustProduct = null;

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Warehouse Inventory page loading...');
    
    if (!auth.isLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }
    
    if (!auth.hasRole(['warehouse', 'admin'])) {
        alert('Access denied. Warehouse privileges required.');
        auth.logout();
        return;
    }
    
    new Header('appHeader');
    new Sidebar('sidebar', 'inventory');
    
    await loadCategories();
    await loadInventory();
    
    setupEventListeners();
});

// ============================================
// LOAD CATEGORIES FOR FILTER
// ============================================
async function loadCategories() {
    try {
        const response = await apiCall('/categories');
        const categories = response.data || [];
        
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">All Categories</option>' + 
                categories.map(cat => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join('');
        }
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

// ============================================
// LOAD INVENTORY DATA
// ============================================
async function loadInventory() {
    const container = document.getElementById('inventoryTable');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading">Loading inventory...</div>';
        
        const user = auth.getCurrentUser();
        const warehouseId = user.warehouse_id || 1;
        
        const response = await apiCall(`/inventory/warehouse/${warehouseId}`);
        allInventory = response.data || [];
        
        // Apply filters
        let filteredInventory = [...allInventory];
        
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const categoryId = document.getElementById('categoryFilter')?.value;
        const stockStatus = document.getElementById('stockStatusFilter')?.value;
        
        if (searchTerm) {
            filteredInventory = filteredInventory.filter(item => 
                (item.product_name && item.product_name.toLowerCase().includes(searchTerm)) ||
                (item.sku && item.sku.toLowerCase().includes(searchTerm))
            );
        }
        
        if (categoryId) {
            // Need to fetch product details for category filtering
            // For now, we'll filter client-side if we have category info
            // This is a simplification - in production, you'd want server-side filtering
        }
        
        if (stockStatus === 'low') {
            filteredInventory = filteredInventory.filter(item => item.quantity <= item.reorder_point && item.quantity > 0);
        } else if (stockStatus === 'out') {
            filteredInventory = filteredInventory.filter(item => item.quantity === 0);
        }
        
        document.getElementById('inventoryCount').textContent = `${filteredInventory.length} items`;
        
        if (filteredInventory.length === 0) {
            container.innerHTML = '<div class="empty-state">No inventory items found</div>';
            return;
        }
        
        // Build table
        const tableHtml = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Category</th>
                        <th>Quantity</th>
                        <th>Reorder Point</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredInventory.map(item => {
                        let statusClass = '';
                        let statusText = '';
                        if (item.quantity === 0) {
                            statusClass = 'status-out';
                            statusText = 'Out of Stock';
                        } else if (item.quantity <= item.reorder_point) {
                            statusClass = 'status-low';
                            statusText = 'Low Stock';
                        } else {
                            statusClass = 'status-ok';
                            statusText = 'In Stock';
                        }
                        
                        return `
                            <tr>
                                <td><strong>${escapeHtml(item.product_name || 'Product ID: ' + item.product_id)}</strong></td>
                                <td><span class="sku">${escapeHtml(item.sku || '—')}</span></td>
                                <td>—</td>
                                <td class="quantity-cell ${item.quantity <= item.reorder_point ? 'warning' : ''}">${item.quantity}</td>
                                <td>${item.reorder_point || 0}</td>
                                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                                <td class="actions-cell">
                                    <button class="btn-icon" onclick="openAdjustStockModal(${item.product_id}, ${item.warehouse_id}, '${escapeHtml(item.product_name)}', ${item.quantity})" title="Adjust Stock">✏️</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHtml;
        
    } catch (error) {
        console.error('Failed to load inventory:', error);
        container.innerHTML = '<div class="error-state">Failed to load inventory. Please refresh.</div>';
    }
}

// ============================================
// OPEN ADJUST STOCK MODAL
// ============================================
function openAdjustStockModal(productId, warehouseId, productName, currentQty) {
    currentAdjustProduct = { productId, warehouseId, productName, currentQty };
    
    document.getElementById('adjustProductId').value = productId;
    document.getElementById('adjustWarehouseId').value = warehouseId;
    document.getElementById('adjustProductName').value = productName;
    document.getElementById('adjustCurrentQty').value = currentQty;
    document.getElementById('adjustNewQty').value = currentQty;
    document.getElementById('adjustReason').value = '';
    document.getElementById('adjustNotes').value = '';
    
    // Check if selected reason requires approval
    const reasonSelect = document.getElementById('adjustReason');
    const approvalWarning = document.getElementById('approvalWarning');
    
    reasonSelect.onchange = function() {
        const requiresApproval = (this.value === 'THEFT' || this.value === 'QUALITY_ISSUE');
        approvalWarning.style.display = requiresApproval ? 'block' : 'none';
    };
    
    document.getElementById('adjustStockModal').style.display = 'flex';
}

function closeAdjustStockModal() {
    document.getElementById('adjustStockModal').style.display = 'none';
    currentAdjustProduct = null;
}

// ============================================
// SUBMIT STOCK ADJUSTMENT
// ============================================
async function submitStockAdjustment() {
    const newQuantity = parseInt(document.getElementById('adjustNewQty').value);
    const reason = document.getElementById('adjustReason').value;
    const notes = document.getElementById('adjustNotes').value;
    
    if (!currentAdjustProduct) {
        showToast('Invalid adjustment data', 'error');
        return;
    }
    
    if (isNaN(newQuantity) || newQuantity < 0) {
        showToast('Please enter a valid quantity', 'error');
        return;
    }
    
    if (!reason) {
        showToast('Please select a reason for adjustment', 'error');
        return;
    }
    
    const adjustmentData = {
        product_id: currentAdjustProduct.productId,
        warehouse_id: currentAdjustProduct.warehouseId,
        new_quantity: newQuantity,
        reason_code: reason,
        notes: notes
    };
    
    try {
        showToast('Processing adjustment...', 'info');
        
        const response = await apiCall('/inventory/adjust', {
            method: 'POST',
            body: JSON.stringify(adjustmentData)
        });
        
        if (response.success) {
            showToast(`Stock adjusted from ${currentAdjustProduct.currentQty} to ${newQuantity}`, 'success');
            closeAdjustStockModal();
            await loadInventory();
        } else {
            throw new Error(response.error);
        }
        
    } catch (error) {
        console.error('Adjustment failed:', error);
        showToast(error.message || 'Failed to adjust stock', 'error');
    }
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    const applyBtn = document.getElementById('applyFilter');
    const resetBtn = document.getElementById('resetFilter');
    const searchInput = document.getElementById('searchInput');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', loadInventory);
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('categoryFilter').value = '';
            document.getElementById('stockStatusFilter').value = '';
            loadInventory();
        });
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadInventory();
        });
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
window.openAdjustStockModal = openAdjustStockModal;
window.closeAdjustStockModal = closeAdjustStockModal;
window.submitStockAdjustment = submitStockAdjustment;

console.log('✅ Warehouse Inventory module loaded');