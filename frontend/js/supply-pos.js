// frontend/js/supply-pos.js


// ============================================
// GLOBAL VARIABLES
// ============================================
let allPOs = [];
let allSuppliers = [];
let allProducts = [];
let currentPO = null;
let currentPage = 1;
let itemsPerPage = 10;
let currentFilters = {
    status: '',
    supplier_id: '',
    search: ''
};

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Supply Purchase Orders page loading...');
    
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
    new Sidebar('sidebar', 'purchase-orders');
    
    await loadSuppliers();
    await loadProducts();
    await loadPOs();
    
    setupEventListeners();
});

// ============================================
// LOAD SUPPLIERS FOR DROPDOWN
// ============================================
async function loadSuppliers() {
    try {
        const response = await apiCall('/suppliers?is_active=true');
        allSuppliers = response.data || [];
        
        const supplierSelect = document.getElementById('poSupplier');
        const supplierFilter = document.getElementById('supplierFilter');
        
        const options = '<option value="">Select Supplier</option>' +
            allSuppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
        
        if (supplierSelect) supplierSelect.innerHTML = options;
        if (supplierFilter) supplierFilter.innerHTML = '<option value="">All Suppliers</option>' +
            allSuppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
        
    } catch (error) {
        console.error('Failed to load suppliers:', error);
        showToast('Failed to load suppliers', 'error');
    }
}

// ============================================
// LOAD PRODUCTS FOR PO ITEMS
// ============================================
async function loadProducts() {
    try {
        const response = await apiCall('/products?is_active=true');
        allProducts = response.data || [];
        
        // Product select options will be populated when adding rows
    } catch (error) {
        console.error('Failed to load products:', error);
    }
}

// ============================================
// LOAD PURCHASE ORDERS
// ============================================
async function loadPOs() {
    const container = document.getElementById('poTable');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading">Loading purchase orders...</div>';
        
        let query = '/orders/supply?';
        if (currentFilters.status) query += `status=${currentFilters.status}&`;
        if (currentFilters.supplier_id) query += `supplier_id=${currentFilters.supplier_id}&`;
        
        const response = await apiCall(query);
        let orders = response.data || [];
        
        // Apply search filter
        if (currentFilters.search) {
            const searchLower = currentFilters.search.toLowerCase();
            orders = orders.filter(o => 
                o.po_number.toLowerCase().includes(searchLower) ||
                (o.supplier_name && o.supplier_name.toLowerCase().includes(searchLower))
            );
        }
        
        allPOs = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        document.getElementById('poCount').textContent = `${allPOs.length} orders`;
        
        if (allPOs.length === 0) {
            container.innerHTML = '<div class="empty-state">No purchase orders found. Create your first PO!</div>';
            return;
        }
        
        displayPOs();
        
    } catch (error) {
        console.error('Failed to load POs:', error);
        container.innerHTML = '<div class="error-state">Failed to load purchase orders</div>';
    }
}

// ============================================
// DISPLAY POs WITH PAGINATION
// ============================================
function displayPOs() {
    const container = document.getElementById('poTable');
    const start = (currentPage - 1) * itemsPerPage;
    const pagePOs = allPOs.slice(start, start + itemsPerPage);
    const totalPages = Math.ceil(allPOs.length / itemsPerPage);
    
    const tableHtml = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>PO Number</th>
                    <th>Supplier</th>
                    <th>Order Date</th>
                    <th>Expected Delivery</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${pagePOs.map(po => `
                    <tr>
                        <td><strong>${escapeHtml(po.po_number)}</strong></td>
                        <td>${escapeHtml(po.supplier_name || 'Supplier ID: ' + po.supplier_id)}</td>
                        <td>${formatDate(po.order_date)}</td>
                        <td>${po.expected_delivery ? formatDate(po.expected_delivery) : '—'}</td>
                        <td>$${(po.total_amount || 0).toFixed(2)}</td>
                        <td><span class="status-badge status-${po.status}">${po.status}</span></td>
                        <td>
                            <button class="btn-icon" onclick="viewPODetails(${po.id})" title="View">👁️</button>
                            ${po.status === 'pending' ? `<button class="btn-icon" onclick="editPO(${po.id})" title="Edit">✏️</button>` : ''}
                            ${po.status === 'pending' ? `<button class="btn-icon" onclick="cancelPO(${po.id})" title="Cancel">🗑️</button>` : ''}
                         </td>
                     </tr>
                `).join('')}
            </tbody>
        </table>
        ${renderPagination(currentPage, totalPages)}
    `;
    
    container.innerHTML = tableHtml;
}

function renderPagination(current, total) {
    if (total <= 1) return '';
    
    let html = '<div class="pagination">';
    for (let i = 1; i <= total; i++) {
        html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    html += '</div>';
    return html;
}

function goToPage(page) {
    currentPage = page;
    displayPOs();
}

// ============================================
// OPEN CREATE PO MODAL
// ============================================
function openCreatePOModal() {
    currentPO = null;
    document.getElementById('poModalTitle').textContent = 'Create Purchase Order';
    document.getElementById('poForm').reset();
    document.getElementById('poId').value = '';
    document.getElementById('poShippingCost').value = '0';
    
    // Reset items container
    document.getElementById('poItemsContainer').innerHTML = `
        <div class="po-item-row">
            <select class="po-product-select" style="width: 40%;">
                <option value="">Select Product</option>
                ${allProducts.map(p => `<option value="${p.id}" data-price="${p.cost}">${escapeHtml(p.name)} (${p.sku})</option>`).join('')}
            </select>
            <input type="number" class="po-quantity" placeholder="Qty" style="width: 15%;" min="1" value="1">
            <input type="number" class="po-unit-price" placeholder="Unit Price" style="width: 20%;" step="0.01">
            <button type="button" class="btn-icon add-item-btn" onclick="addPOItemRow()">+</button>
        </div>
    `;
    
    document.getElementById('poModal').style.display = 'flex';
}

// ============================================
// ADD ITEM ROW TO PO FORM
// ============================================
function addPOItemRow() {
    const container = document.getElementById('poItemsContainer');
    const rowCount = container.children.length;
    
    const newRow = document.createElement('div');
    newRow.className = 'po-item-row';
    newRow.innerHTML = `
        <select class="po-product-select" style="width: 40%;">
            <option value="">Select Product</option>
            ${allProducts.map(p => `<option value="${p.id}" data-price="${p.cost}">${escapeHtml(p.name)} (${p.sku})</option>`).join('')}
        </select>
        <input type="number" class="po-quantity" placeholder="Qty" style="width: 15%;" min="1" value="1">
        <input type="number" class="po-unit-price" placeholder="Unit Price" style="width: 20%;" step="0.01">
        <button type="button" class="btn-icon remove-item-btn" onclick="removePOItemRow(this)">✖</button>
    `;
    
    container.appendChild(newRow);
    
    // Add event listeners to new row
    const productSelect = newRow.querySelector('.po-product-select');
    const priceInput = newRow.querySelector('.po-unit-price');
    
    productSelect.addEventListener('change', () => {
        const selectedOption = productSelect.options[productSelect.selectedIndex];
        const unitPrice = selectedOption.dataset.price;
        if (unitPrice && !priceInput.value) {
            priceInput.value = unitPrice;
        }
        updatePOSummary();
    });
    
    productSelect.addEventListener('change', updatePOSummary);
    newRow.querySelector('.po-quantity').addEventListener('input', updatePOSummary);
    priceInput.addEventListener('input', updatePOSummary);
    
    updatePOSummary();
}

function removePOItemRow(btn) {
    btn.closest('.po-item-row').remove();
    updatePOSummary();
}

// ============================================
// UPDATE PO SUMMARY (Subtotal, Total)
// ============================================
function updatePOSummary() {
    let subtotal = 0;
    const rows = document.querySelectorAll('.po-item-row');
    
    rows.forEach(row => {
        const quantity = parseFloat(row.querySelector('.po-quantity')?.value) || 0;
        const unitPrice = parseFloat(row.querySelector('.po-unit-price')?.value) || 0;
        subtotal += quantity * unitPrice;
    });
    
    const shippingCost = parseFloat(document.getElementById('poShippingCost').value) || 0;
    const total = subtotal + shippingCost;
    
    document.getElementById('poSubtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('poShipping').textContent = `$${shippingCost.toFixed(2)}`;
    document.getElementById('poTotal').textContent = `$${total.toFixed(2)}`;
}

// ============================================
// SAVE PURCHASE ORDER
// ============================================
async function savePurchaseOrder() {
    const supplierId = document.getElementById('poSupplier').value;
    const expectedDelivery = document.getElementById('poExpectedDate').value;
    const shippingCost = parseFloat(document.getElementById('poShippingCost').value) || 0;
    
    if (!supplierId) {
        showToast('Please select a supplier', 'error');
        return;
    }
    
    // Collect items
    const items = [];
    const rows = document.querySelectorAll('.po-item-row');
    
    for (const row of rows) {
        const productId = row.querySelector('.po-product-select').value;
        const quantity = parseInt(row.querySelector('.po-quantity').value);
        const unitPrice = parseFloat(row.querySelector('.po-unit-price').value);
        
        if (productId && quantity > 0 && unitPrice > 0) {
            const product = allProducts.find(p => p.id == productId);
            items.push({
                product_id: parseInt(productId),
                product_name: product?.name || '',
                quantity: quantity,
                unit_price: unitPrice
            });
        }
    }
    
    if (items.length === 0) {
        showToast('Please add at least one item', 'error');
        return;
    }
    
    const poData = {
        supplier_id: parseInt(supplierId),
        expected_delivery: expectedDelivery || null,
        items: items,
        shipping_cost: shippingCost
    };
    
    try {
        showToast('Creating purchase order...', 'info');
        
        const response = await apiCall('/orders/supply', {
            method: 'POST',
            body: JSON.stringify(poData)
        });
        
        if (response.success) {
            showToast(`PO ${response.data.po_number} created successfully`, 'success');
            closePOModal();
            await loadPOs();
        } else {
            throw new Error(response.error);
        }
        
    } catch (error) {
        console.error('Failed to create PO:', error);
        showToast(error.message || 'Failed to create purchase order', 'error');
    }
}

// ============================================
// VIEW PO DETAILS
// ============================================
async function viewPODetails(poId) {
    try {
        const response = await apiCall(`/orders/supply/${poId}`);
        currentPO = response.data;
        
        const items = currentPO.items || [];
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        
        const modalContent = document.getElementById('poDetailsContent');
        modalContent.innerHTML = `
            <div class="po-details-header">
                <h3>${escapeHtml(currentPO.po_number)}</h3>
                <p>Created: ${formatDate(currentPO.created_at)}</p>
            </div>
            
            <div class="po-details-info">
                <div class="info-group">
                    <strong>Supplier:</strong> ${escapeHtml(currentPO.supplier_name || 'Supplier ID: ' + currentPO.supplier_id)}
                </div>
                <div class="info-group">
                    <strong>Expected Delivery:</strong> ${currentPO.expected_delivery ? formatDate(currentPO.expected_delivery) : 'Not set'}
                </div>
                <div class="info-group">
                    <strong>Status:</strong> <span class="status-badge status-${currentPO.status}">${currentPO.status}</span>
                </div>
            </div>
            
            <h4>Order Items</h4>
            <table class="po-items-detail-table">
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
                            <td>$${item.unit_price.toFixed(2)}</td>
                            <td>$${(item.quantity * item.unit_price).toFixed(2)}</td>
                         </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr><td colspan="3"><strong>Subtotal</strong></td><td><strong>$${subtotal.toFixed(2)}</strong></td></tr>
                    ${currentPO.shipping_cost > 0 ? `<tr><td colspan="3">Shipping</td><td>$${currentPO.shipping_cost.toFixed(2)}</td></tr>` : ''}
                    <tr><td colspan="3"><strong>Total</strong></td><td><strong>$${(currentPO.total_amount || subtotal + (currentPO.shipping_cost || 0)).toFixed(2)}</strong></td></tr>
                </tfoot>
            </table>
        `;
        
        document.getElementById('poDetailsModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Failed to load PO details:', error);
        showToast('Failed to load PO details', 'error');
    }
}

// ============================================
// EDIT PO
// ============================================
async function editPO(poId) {
    try {
        const response = await apiCall(`/orders/supply/${poId}`);
        const po = response.data;
        currentPO = po;
        
        document.getElementById('poModalTitle').textContent = 'Edit Purchase Order';
        document.getElementById('poId').value = po.id;
        document.getElementById('poSupplier').value = po.supplier_id;
        document.getElementById('poExpectedDate').value = po.expected_delivery ? po.expected_delivery.split('T')[0] : '';
        document.getElementById('poShippingCost').value = po.shipping_cost || 0;
        
        // Build items container
        const itemsContainer = document.getElementById('poItemsContainer');
        itemsContainer.innerHTML = '';
        
        const items = po.items || [];
        for (const item of items) {
            const row = document.createElement('div');
            row.className = 'po-item-row';
            row.innerHTML = `
                <select class="po-product-select" style="width: 40%;">
                    <option value="">Select Product</option>
                    ${allProducts.map(p => `<option value="${p.id}" data-price="${p.cost}" ${p.id === item.product_id ? 'selected' : ''}>${escapeHtml(p.name)} (${p.sku})</option>`).join('')}
                </select>
                <input type="number" class="po-quantity" placeholder="Qty" style="width: 15%;" min="1" value="${item.quantity}">
                <input type="number" class="po-unit-price" placeholder="Unit Price" style="width: 20%;" step="0.01" value="${item.unit_price}">
                <button type="button" class="btn-icon remove-item-btn" onclick="removePOItemRow(this)">✖</button>
            `;
            itemsContainer.appendChild(row);
        }
        
        // Add empty row if no items
        if (items.length === 0) {
            addPOItemRow();
        }
        
        updatePOSummary();
        document.getElementById('poModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Failed to load PO for edit:', error);
        showToast('Failed to load PO', 'error');
    }
}

// ============================================
// CANCEL PO
// ============================================
async function cancelPO(poId) {
    if (!confirm('Are you sure you want to cancel this purchase order?')) return;
    
    try {
        await apiCall(`/orders/supply/${poId}/cancel`, { method: 'POST' });
        showToast('Purchase order cancelled', 'success');
        await loadPOs();
    } catch (error) {
        console.error('Failed to cancel PO:', error);
        showToast('Failed to cancel PO', 'error');
    }
}

// ============================================
// PRINT PO
// ============================================
function printPO() {
    if (!currentPO) return;
    
    const printContent = document.getElementById('poDetailsContent').cloneNode(true);
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>PO ${currentPO.po_number}</title>
            <style>
                body { font-family: 'DM Sans', Arial, sans-serif; margin: 40px; }
                .po-details-header { text-align: center; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background: #f5f5f5; }
                @media print { button { display: none; } }
            </style>
        </head>
        <body>
            ${printContent.innerHTML}
            <p style="margin-top: 40px; text-align: center;">Thank you for your business!</p>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function closePOModal() {
    document.getElementById('poModal').style.display = 'none';
}

function closePODetailsModal() {
    document.getElementById('poDetailsModal').style.display = 'none';
    currentPO = null;
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function applyFilters() {
    currentFilters = {
        status: document.getElementById('statusFilter')?.value || '',
        supplier_id: document.getElementById('supplierFilter')?.value || '',
        search: document.getElementById('searchInput')?.value || ''
    };
    currentPage = 1;
    loadPOs();
}

function resetFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const supplierFilter = document.getElementById('supplierFilter');
    const searchInput = document.getElementById('searchInput');
    
    if (statusFilter) statusFilter.value = '';
    if (supplierFilter) supplierFilter.value = '';
    if (searchInput) searchInput.value = '';
    
    currentFilters = { status: '', supplier_id: '', search: '' };
    currentPage = 1;
    loadPOs();
}

function setupEventListeners() {
    const applyBtn = document.getElementById('applyFilter');
    const resetBtn = document.getElementById('resetFilter');
    const shippingCost = document.getElementById('poShippingCost');
    
    if (applyBtn) applyBtn.addEventListener('click', applyFilters);
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    if (shippingCost) shippingCost.addEventListener('input', updatePOSummary);
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
window.openCreatePOModal = openCreatePOModal;
window.closePOModal = closePOModal;
window.savePurchaseOrder = savePurchaseOrder;
window.viewPODetails = viewPODetails;
window.closePODetailsModal = closePODetailsModal;
window.editPO = editPO;
window.cancelPO = cancelPO;
window.printPO = printPO;
window.addPOItemRow = addPOItemRow;
window.removePOItemRow = removePOItemRow;
window.updatePOSummary = updatePOSummary;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.goToPage = goToPage;

console.log('✅ Supply Purchase Orders module loaded');