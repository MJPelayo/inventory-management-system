// frontend/js/warehouse-inventory.js

// ============================================
// GLOBAL VARIABLES
// ============================================
let allInventory = [];
let currentAdjustProduct = null;
let allProducts = []; // For dropdown

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
    await loadProductsForDropdown(); // Load products for adjustment dropdown
    await loadInventory();
    
    setupEventListeners();
});

// ============================================
// LOAD PRODUCTS FOR ADJUSTMENT DROPDOWN
// ============================================
async function loadProductsForDropdown() {
    try {
        const response = await apiCall('/products?is_active=true');
        allProducts = response.data || [];
        
        // Populate product dropdown in adjustment modal
        const productSelect = document.getElementById('adjustProductSelect');
        if (productSelect) {
            productSelect.innerHTML = '<option value="">-- Select Product --</option>' +
                allProducts.map(p => `<option value="${p.id}" data-name="${escapeHtml(p.name)}" data-sku="${p.sku}">${escapeHtml(p.name)} (${p.sku})</option>`).join('');
            
            // Add event listener to populate product info when selected
            productSelect.addEventListener('change', onProductSelectForAdjustment);
        }
    } catch (error) {
        console.error('Failed to load products:', error);
    }
}

// ============================================
// HANDLE PRODUCT SELECTION FOR ADJUSTMENT
// ============================================
async function onProductSelectForAdjustment() {
    const productId = document.getElementById('adjustProductSelect').value;
    if (!productId) return;
    
    const user = auth.getCurrentUser();
    const warehouseId = user.warehouse_id || 1;
    
    try {
        // Get current inventory for this product in this warehouse
        const response = await apiCall(`/inventory/warehouse/${warehouseId}`);
        const inventory = response.data || [];
        const productInventory = inventory.find(i => i.product_id == productId);
        
        const selectedProduct = allProducts.find(p => p.id == productId);
        
        if (selectedProduct) {
            document.getElementById('adjustProductName').value = selectedProduct.name;
            document.getElementById('adjustProductSku').value = selectedProduct.sku;
            document.getElementById('adjustCurrentQty').value = productInventory ? productInventory.quantity : 0;
            document.getElementById('adjustNewQty').value = productInventory ? productInventory.quantity : 0;
            document.getElementById('adjustProductId').value = productId;
            
            // Get warehouse ID from user or from inventory
            const warehouseIdForAdjust = productInventory ? productInventory.warehouse_id : (user.warehouse_id || 1);
            document.getElementById('adjustWarehouseId').value = warehouseIdForAdjust;
        }
    } catch (error) {
        console.error('Failed to get product inventory:', error);
        showToast('Failed to load product stock information', 'error');
    }
}

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
        
        // ✅ FIX: Get inventory with complete product details
        const response = await apiCall(`/inventory/warehouse/${warehouseId}`);
        let inventory = response.data || [];
        
        // Apply filters
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const stockStatus = document.getElementById('stockStatusFilter')?.value;
        
        if (searchTerm) {
            inventory = inventory.filter(item =>
                (item.product_name && item.product_name.toLowerCase().includes(searchTerm)) ||
                (item.sku && item.sku.toLowerCase().includes(searchTerm))
            );
        }
        
        if (stockStatus === 'low') {
            inventory = inventory.filter(item => item.quantity <= item.reorder_point && item.quantity > 0);
        } else if (stockStatus === 'out') {
            inventory = inventory.filter(item => item.quantity === 0);
        }
        
        document.getElementById('inventoryCount').textContent = `${inventory.length} items`;
        
        if (inventory.length === 0) {
            container.innerHTML = '<div class="empty-state">No inventory items found</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Brand</th>
                        <th>Quantity</th>
                        <th>Reorder Point</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${inventory.map(item => {
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
                                <td>
                                    <strong>${escapeHtml(item.product_name || 'Product ID: ' + item.product_id)}</strong>
                                    ${item.description ? `<div class="product-desc">${escapeHtml(item.description.substring(0, 50))}</div>` : ''}
                                </td>
                                <td><span class="sku">${escapeHtml(item.sku || '—')}</span></td>
                                <td>${escapeHtml(item.brand || '—')}</td>
                                <td class="${item.quantity <= item.reorder_point ? 'warning' : ''}">${item.quantity}</td>
                                <td>${item.reorder_point || 0}</td>
                                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                                <td class="actions-cell">
                                    <button class="btn-icon" onclick="openAdjustStockModalForProduct(${item.product_id}, ${item.warehouse_id}, '${escapeHtml(item.product_name || '')}', ${item.quantity}, '${escapeHtml(item.sku || '')}')">✏️ Adjust</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Failed to load inventory:', error);
        container.innerHTML = '<div class="error-state">Failed to load inventory. Please refresh.</div>';
    }
}

// ============================================
// OPEN ADJUST STOCK MODAL (with product selection)
// ============================================
function openAdjustStockModal() {
    // Reset form
    document.getElementById('adjustProductSelect').value = '';
    document.getElementById('adjustProductName').value = '';
    document.getElementById('adjustProductSku').value = '';
    document.getElementById('adjustCurrentQty').value = '';
    document.getElementById('adjustNewQty').value = '';
    document.getElementById('adjustReason').value = '';
    document.getElementById('adjustNotes').value = '';
    document.getElementById('approvalWarning').style.display = 'none';
    
    document.getElementById('adjustStockModal').style.display = 'flex';
}

async function openAdjustStockModalForProduct(productId, warehouseId, productName, currentQty, sku) {
    // Set the product select to this product
    const productSelect = document.getElementById('adjustProductSelect');
    if (productSelect) {
        productSelect.value = productId;
    }
    
    // Set all form fields directly with the provided data
    const productNameEl = document.getElementById('adjustProductName');
    const productSkuEl = document.getElementById('adjustProductSku');
    const currentQtyEl = document.getElementById('adjustCurrentQty');
    const newQtyEl = document.getElementById('adjustNewQty');
    const productIdEl = document.getElementById('adjustProductId');
    const warehouseIdEl = document.getElementById('adjustWarehouseId');
    
    if (productNameEl) productNameEl.value = productName || '';
    if (productSkuEl) productSkuEl.value = sku || '';
    if (currentQtyEl) currentQtyEl.value = currentQty ?? 0;
    if (newQtyEl) newQtyEl.value = currentQty ?? 0;
    if (productIdEl) productIdEl.value = productId;
    if (warehouseIdEl) warehouseIdEl.value = warehouseId;
    
    // Reset other fields
    const reasonEl = document.getElementById('adjustReason');
    const notesEl = document.getElementById('adjustNotes');
    const approvalWarningEl = document.getElementById('approvalWarning');
    
    if (reasonEl) reasonEl.value = '';
    if (notesEl) notesEl.value = '';
    if (approvalWarningEl) approvalWarningEl.style.display = 'none';
    
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
    const productId = document.getElementById('adjustProductId').value;
    const warehouseId = document.getElementById('adjustWarehouseId').value;
    const newQuantity = parseInt(document.getElementById('adjustNewQty').value);
    const reason = document.getElementById('adjustReason').value;
    const notes = document.getElementById('adjustNotes').value;
    
    if (!productId) {
        showToast('Please select a product', 'error');
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
    
    const currentQty = parseInt(document.getElementById('adjustCurrentQty').value);
    
    const adjustmentData = {
        product_id: parseInt(productId),
        warehouse_id: parseInt(warehouseId),
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
            showToast(`Stock adjusted from ${currentQty} to ${newQuantity}`, 'success');
            closeAdjustStockModal();
            await loadInventory(); // Refresh the table
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
    const reasonSelect = document.getElementById('adjustReason');
    const approvalWarning = document.getElementById('approvalWarning');
    
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
    if (reasonSelect) {
        reasonSelect.addEventListener('change', () => {
            const requiresApproval = (reasonSelect.value === 'THEFT' || reasonSelect.value === 'QUALITY_ISSUE');
            if (approvalWarning) {
                approvalWarning.style.display = requiresApproval ? 'block' : 'none';
            }
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
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
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
window.openAdjustStockModalForProduct = openAdjustStockModalForProduct;

console.log('✅ Warehouse Inventory module loaded');