// frontend/js/supply-reorder.js
/**
 * Supply Auto-Reorder Module
 * Handles reorder suggestions and bulk PO creation
 * 
 * @module supply-reorder
 */

// ============================================
// GLOBAL VARIABLES
// ============================================
let allSuggestions = [];
let selectedItems = new Set();
let allSuppliers = [];
let currentFilters = {
    priority: 'all',
    supplier_id: '',
    search: ''
};

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Supply Reorder page loading...');
    
    if (!auth.isLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }
    
    if (!auth.hasRole(['supply', 'admin'])) {
        alert('Access denied. Supply privileges required.');
        auth.logout();
        return;
    }
    
    new Header('appHeader');
    new Sidebar('sidebar', 'reorder');
    
    await loadSuppliers();
    await loadReorderSuggestions();
    
    setupEventListeners();
});

// ============================================
// LOAD SUPPLIERS FOR FILTER
// ============================================
async function loadSuppliers() {
    try {
        const response = await apiCall('/suppliers?is_active=true');
        allSuppliers = response.data || [];
        
        const supplierFilter = document.getElementById('supplierFilter');
        if (supplierFilter) {
            supplierFilter.innerHTML = '<option value="">All Suppliers</option>' +
                allSuppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
        }
    } catch (error) {
        console.error('Failed to load suppliers:', error);
    }
}

// ============================================
// LOAD REORDER SUGGESTIONS
// ============================================
async function loadReorderSuggestions() {
    const container = document.getElementById('reorderTable');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading">Loading suggestions...</div>';
        
        const response = await apiCall('/inventory/reorder-suggestions');
        let suggestions = response.data || [];
        
        // Apply filters
        if (currentFilters.priority !== 'all') {
            suggestions = suggestions.filter(s => s.priority === currentFilters.priority);
        }
        if (currentFilters.supplier_id) {
            suggestions = suggestions.filter(s => s.supplier_id == currentFilters.supplier_id);
        }
        if (currentFilters.search) {
            const searchLower = currentFilters.search.toLowerCase();
            suggestions = suggestions.filter(s => 
                s.name.toLowerCase().includes(searchLower) ||
                s.sku.toLowerCase().includes(searchLower)
            );
        }
        
        allSuggestions = suggestions;
        
        if (allSuggestions.length === 0) {
            container.innerHTML = '<div class="empty-state">No reorder suggestions at this time. All stock levels are healthy.</div>';
            return;
        }
        
        displayReorderTable();
        
    } catch (error) {
        console.error('Failed to load reorder suggestions:', error);
        container.innerHTML = '<div class="error-state">Failed to load suggestions</div>';
    }
}

// ============================================
// DISPLAY REORDER TABLE
// ============================================
function displayReorderTable() {
    const container = document.getElementById('reorderTable');
    
    const tableHtml = `
        <table class="data-table reorder-table">
            <thead>
                <tr>
                    <th style="width: 40px;"><input type="checkbox" id="headerCheckbox" onchange="toggleSelectAll()"></th>
                    <th>Product</th>
                    <th>Supplier</th>
                    <th>Current Stock</th>
                    <th>Reorder Point</th>
                    <th>Suggested Qty</th>
                    <th>Priority</th>
                </tr>
            </thead>
            <tbody>
                ${allSuggestions.map(suggestion => `
                    <tr class="priority-${suggestion.priority}">
                        <td><input type="checkbox" class="suggestion-checkbox" data-id="${suggestion.id}" data-supplier="${suggestion.supplier_id}" data-product="${suggestion.id}" data-name="${escapeHtml(suggestion.name)}" data-sku="${escapeHtml(suggestion.sku)}" data-suggested="${suggestion.suggested_quantity}" onchange="updateSelectedCount()"></td>
                        <td><strong>${escapeHtml(suggestion.name)}</strong><br><small>${escapeHtml(suggestion.sku)}</small></td>
                        <td>${escapeHtml(suggestion.supplier_name)}</td>
                        <td class="${suggestion.current_stock <= suggestion.reorder_point ? 'warning-text' : ''}">${suggestion.current_stock}</td>
                        <td>${suggestion.reorder_point}</td>
                        <td><strong>${suggestion.suggested_quantity}</strong></td>
                        <td><span class="priority-badge priority-${suggestion.priority}">${suggestion.priority === 'critical' ? '🔴 Critical' : suggestion.priority === 'warning' ? '🟡 Warning' : '🟢 OK'}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHtml;
    updateSelectedCount();
}

// ============================================
// UPDATE SELECTED COUNT
// ============================================
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.suggestion-checkbox:checked');
    selectedItems.clear();
    checkboxes.forEach(cb => {
        selectedItems.add({
            id: cb.dataset.id,
            supplier_id: cb.dataset.supplier,
            product_id: cb.dataset.product,
            name: cb.dataset.name,
            sku: cb.dataset.sku,
            quantity: cb.dataset.suggested
        });
    });
    
    const count = selectedItems.size;
    const bulkBar = document.getElementById('bulkActionsBar');
    const selectedCountSpan = document.getElementById('selectedCount');
    
    if (count > 0) {
        bulkBar.style.display = 'flex';
        selectedCountSpan.textContent = `${count} item(s) selected`;
    } else {
        bulkBar.style.display = 'none';
    }
    
    // Update header checkbox
    const headerCheckbox = document.getElementById('headerCheckbox');
    const allCheckboxes = document.querySelectorAll('.suggestion-checkbox');
    if (headerCheckbox && allCheckboxes.length > 0) {
        headerCheckbox.checked = allCheckboxes.length === checkboxes.length;
        headerCheckbox.indeterminate = checkboxes.length > 0 && checkboxes.length < allCheckboxes.length;
    }
}

// ============================================
// TOGGLE SELECT ALL
// ============================================
function toggleSelectAll() {
    const headerCheckbox = document.getElementById('headerCheckbox');
    const allCheckboxes = document.querySelectorAll('.suggestion-checkbox');
    
    allCheckboxes.forEach(cb => {
        cb.checked = headerCheckbox.checked;
    });
    
    updateSelectedCount();
}

// ============================================
// CLEAR SELECTION
// ============================================
function clearSelection() {
    const allCheckboxes = document.querySelectorAll('.suggestion-checkbox');
    allCheckboxes.forEach(cb => cb.checked = false);
    updateSelectedCount();
}

// ============================================
// CREATE PURCHASE ORDERS FROM SELECTED SUGGESTIONS
// ============================================
async function createOrdersFromSuggestions() {
    if (selectedItems.size === 0) {
        showToast('Please select at least one item to reorder', 'error');
        return;
    }
    
    // Group by supplier
    const ordersBySupplier = new Map();
    
    for (const item of selectedItems) {
        const supplierId = item.supplier_id;
        if (!ordersBySupplier.has(supplierId)) {
            const supplier = allSuppliers.find(s => s.id == supplierId);
            ordersBySupplier.set(supplierId, {
                supplier_id: supplierId,
                supplier_name: supplier?.name || 'Unknown',
                items: []
            });
        }
        
        ordersBySupplier.get(supplierId).items.push({
            product_id: parseInt(item.product_id),
            quantity: parseInt(item.quantity),
            unit_price: 0 // Will be filled from product cost
        });
    }
    
    // Confirm with user
    let confirmMessage = 'Create purchase orders for:\n\n';
    for (const [_, order] of ordersBySupplier) {
        confirmMessage += `📦 ${order.supplier_name}: ${order.items.length} item(s)\n`;
    }
    confirmMessage += '\nProceed?';
    
    if (!confirm(confirmMessage)) return;
    
    showToast('Creating purchase orders...', 'info');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const [_, order] of ordersBySupplier) {
        try {
            // Fetch product costs to set unit prices
            const itemsWithPrices = [];
            for (const item of order.items) {
                const productRes = await apiCall(`/products/${item.product_id}`);
                const product = productRes.data;
                itemsWithPrices.push({
                    ...item,
                    unit_price: product.cost || 0
                });
            }
            
            const poData = {
                supplier_id: order.supplier_id,
                items: itemsWithPrices,
                expected_delivery: getDefaultExpectedDate()
            };
            
            const response = await apiCall('/orders/supply', {
                method: 'POST',
                body: JSON.stringify(poData)
            });
            
            if (response.success) {
                successCount++;
            } else {
                errorCount++;
            }
        } catch (error) {
            console.error(`Failed to create PO for supplier ${order.supplier_id}:`, error);
            errorCount++;
        }
    }
    
    showToast(`Created ${successCount} purchase order(s). ${errorCount} failed.`, 'success');
    
    // Clear selection and refresh
    clearSelection();
    await loadReorderSuggestions();
}

function getDefaultExpectedDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
}

// ============================================
// APPLY FILTERS
// ============================================
function applyFilters() {
    currentFilters = {
        priority: document.getElementById('priorityFilter')?.value || 'all',
        supplier_id: document.getElementById('supplierFilter')?.value || '',
        search: document.getElementById('searchInput')?.value || ''
    };
    clearSelection();
    loadReorderSuggestions();
}

function resetFilters() {
    const priorityFilter = document.getElementById('priorityFilter');
    const supplierFilter = document.getElementById('supplierFilter');
    const searchInput = document.getElementById('searchInput');
    
    if (priorityFilter) priorityFilter.value = 'all';
    if (supplierFilter) supplierFilter.value = '';
    if (searchInput) searchInput.value = '';
    
    currentFilters = { priority: 'all', supplier_id: '', search: '' };
    clearSelection();
    loadReorderSuggestions();
}

function setupEventListeners() {
    const applyBtn = document.getElementById('applyFilter');
    const resetBtn = document.getElementById('resetFilter');
    const searchInput = document.getElementById('searchInput');
    
    if (applyBtn) applyBtn.addEventListener('click', applyFilters);
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') applyFilters();
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
window.toggleSelectAll = toggleSelectAll;
window.clearSelection = clearSelection;
window.updateSelectedCount = updateSelectedCount;
window.createOrdersFromSuggestions = createOrdersFromSuggestions;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;

console.log('✅ Supply Reorder module loaded');