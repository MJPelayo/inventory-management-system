// frontend/js/admin-products.js

// ============================================
// GLOBAL VARIABLES
// ============================================
let productsTable = null;
let currentProductId = null;
let categoriesList = [];
let suppliersList = [];

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin Products page loading...');
    
    if (!auth.isLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }
    
    if (!auth.hasRole('admin')) {
        alert('Access denied. Admin privileges required.');
        auth.logout();
        return;
    }
    
    new Header('appHeader');
    new Sidebar('sidebar', 'products');
    
    await loadDropdownData();
    await loadProducts();
    setupEventListeners();
});

// ============================================
// LOAD DROPDOWN DATA
// ============================================
async function loadDropdownData() {
    try {
        const categoriesRes = await apiCall('/categories');
        categoriesList = categoriesRes.data || [];
        populateCategoryDropdowns(categoriesList);
        
        const suppliersRes = await apiCall('/suppliers?is_active=true');
        suppliersList = suppliersRes.data || [];
        populateSupplierDropdowns(suppliersList);
    } catch (error) {
        console.error('Failed to load dropdown data:', error);
    }
}

function populateCategoryDropdowns(categories) {
    const categorySelect = document.getElementById('productCategory');
    const filterCategory = document.getElementById('filterCategory');
    
    const buildOptions = (cats, prefix = '') => {
        let html = '';
        for (const cat of cats) {
            if (!cat.parent_id) {
                html += `<option value="${cat.id}">${prefix}${escapeHtml(cat.name)}</option>`;
                const children = cats.filter(c => c.parent_id === cat.id);
                html += buildOptions(children, prefix + '  └ ');
            }
        }
        return html;
    };
    
    const options = buildOptions(categories);
    
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">Select Category</option>' + options;
    }
    if (filterCategory) {
        filterCategory.innerHTML = '<option value="">All Categories</option>' + options;
    }
}

function populateSupplierDropdowns(suppliers) {
    const supplierSelect = document.getElementById('productSupplier');
    const filterSupplier = document.getElementById('filterSupplier');
    
    const options = suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
    
    if (supplierSelect) {
        supplierSelect.innerHTML = '<option value="">Select Supplier</option>' + options;
    }
    if (filterSupplier) {
        filterSupplier.innerHTML = '<option value="">All Suppliers</option>' + options;
    }
}

// ============================================
// CALCULATE MARGIN (from Version B)
// ============================================
function calcMargin(price, cost) {
    if (!price || price === 0) return 0;
    return ((price - cost) / price) * 100;
}

function calcMarkup(price, cost) {
    if (!cost || cost === 0) return 0;
    return ((price - cost) / cost) * 100;
}

function getMarginBadgeClass(margin) {
    if (margin >= 40) return 'badge-success';
    if (margin >= 20) return 'badge-warning';
    return 'badge-danger';
}

// ============================================
// UPDATE MARGIN PREVIEW (NEW from Version B)
// ============================================
function updateMarginPreview() {
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const cost = parseFloat(document.getElementById('productCost').value) || 0;
    const preview = document.getElementById('marginPreview');
    
    if (price > 0 && preview) {
        preview.style.display = 'block';
        const margin = calcMargin(price, cost);
        const marginElement = document.getElementById('previewMargin');
        if (marginElement) {
            marginElement.textContent = margin.toFixed(1) + '%';
            marginElement.className = `mp-val ${margin >= 40 ? 'good' : margin >= 20 ? 'warn' : 'bad'}`;
        }
        const profitElement = document.getElementById('previewProfit');
        if (profitElement) profitElement.textContent = '$' + (price - cost).toFixed(2);
        const markupElement = document.getElementById('previewMarkup');
        if (markupElement) markupElement.textContent = calcMarkup(price, cost).toFixed(1) + '%';
    } else if (preview) {
        preview.style.display = 'none';
    }
}

// ============================================
// LOAD PRODUCTS TABLE
// ============================================
async function loadProducts() {
    try {
        const categoryId = document.getElementById('filterCategory')?.value || '';
        const supplierId = document.getElementById('filterSupplier')?.value || '';
        const searchTerm = document.getElementById('filterSearch')?.value || '';
        
        let query = '/products?';
        if (categoryId) query += `category_id=${categoryId}&`;
        if (supplierId) query += `supplier_id=${supplierId}&`;
        if (searchTerm) query += `search=${encodeURIComponent(searchTerm)}&`;
        
        const response = await apiCall(query);
        const products = response.data || [];
        
        const formattedProducts = products.map(p => {
            const margin = calcMargin(p.price, p.cost);
            return {
                id: p.id,
                name: `<div class="product-name">${escapeHtml(p.name)}</div>${p.description ? `<div class="product-desc">${escapeHtml(p.description.substring(0, 50))}</div>` : ''}`,
                sku: `<span class="mono">${escapeHtml(p.sku)}</span>`,
                brand: escapeHtml(p.brand || '—'),
                category: escapeHtml(p.category_name || '—'),
                price: `$${parseFloat(p.price).toFixed(2)}`,
                cost: `$${parseFloat(p.cost).toFixed(2)}`,
                margin: `<span class="badge ${getMarginBadgeClass(margin)}">${margin.toFixed(1)}%</span>`,
                status: p.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'
            };
        });
        
        const columns = [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Product' },
            { key: 'sku', label: 'SKU' },
            { key: 'brand', label: 'Brand' },
            { key: 'category', label: 'Category' },
            { key: 'price', label: 'Price' },
            { key: 'cost', label: 'Cost' },
            { key: 'margin', label: 'Margin' },
            { key: 'status', label: 'Status' }
        ];
        
        if (productsTable) {
            productsTable.setData(formattedProducts);
        } else {
            productsTable = new DataTable('productsTable', columns, {
                itemsPerPage: 10,
                searchable: false,
                sortable: true,
                onEdit: (id) => openProductModal(id),
                onDelete: (id) => deleteProduct(id),
                onView: (id) => viewProductDetails(id)
            });
            productsTable.setData(formattedProducts);
        }
        
        updateProductStats(products);
        
    } catch (error) {
        console.error('Failed to load products:', error);
        const container = document.getElementById('productsTable');
        if (container) container.innerHTML = '<div class="error-state">Failed to load products</div>';
    }
}

function updateProductStats(products) {
    const statsContainer = document.getElementById('productStats');
    if (!statsContainer) return;
    
    const active = products.filter(p => p.is_active).length;
    const avgMargin = products.length > 0 
        ? products.reduce((sum, p) => sum + calcMargin(p.price, p.cost), 0) / products.length 
        : 0;
    
    statsContainer.innerHTML = `
        <span class="stat-chip">Total: ${products.length}</span>
        <span class="stat-chip">Active: ${active}</span>
        <span class="stat-chip">Avg Margin: ${avgMargin.toFixed(1)}%</span>
    `;
}

// ============================================
// PRODUCT MODAL (with margin preview)
// ============================================
async function openProductModal(productId = null) {
    currentProductId = productId;
    const modal = document.getElementById('productModal');
    const isEdit = productId !== null;
    
    document.getElementById('productForm').reset();
    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Product' : 'Add Product';
    document.getElementById('productId').value = '';
    
    const inventorySection = document.getElementById('inventorySection');
    if (inventorySection) inventorySection.style.display = isEdit ? 'block' : 'none';
    
    const marginPreview = document.getElementById('marginPreview');
    if (marginPreview) marginPreview.style.display = 'none';
    
    if (isEdit) {
        try {
            const response = await apiCall(`/products/${productId}`);
            const product = response.data;
            
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productSku').value = product.sku;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productCost').value = product.cost;
            document.getElementById('productBrand').value = product.brand || '';
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productCategory').value = product.category_id || '';
            document.getElementById('productSupplier').value = product.supplier_id || '';
            document.getElementById('productActive').checked = product.is_active;
            
            updateMarginPreview();
        } catch (error) {
            console.error('Failed to load product:', error);
            alert('Failed to load product data');
            return;
        }
    }
    
    modal.style.display = 'flex';
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    currentProductId = null;
}

// ============================================
// SAVE PRODUCT
// ============================================
async function saveProduct() {
    const productId = document.getElementById('productId').value;
    const isEdit = productId !== '';
    
    const name = document.getElementById('productName').value.trim();
    const sku = document.getElementById('productSku').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const cost = parseFloat(document.getElementById('productCost').value);
    
    if (!name || name.length < 2) {
        alert('Product name must be at least 2 characters');
        return;
    }
    if (!sku || sku.length < 2) {
        alert('SKU must be at least 2 characters');
        return;
    }
    if (isNaN(price) || price < 0) {
        alert('Valid price is required');
        return;
    }
    if (isNaN(cost) || cost < 0) {
        alert('Valid cost is required');
        return;
    }
    if (cost > price) {
        alert('Cost cannot be greater than price');
        return;
    }
    
    const productData = {
        name, sku, price, cost,
        brand: document.getElementById('productBrand').value || null,
        description: document.getElementById('productDescription').value || null,
        category_id: parseInt(document.getElementById('productCategory').value) || null,
        supplier_id: parseInt(document.getElementById('productSupplier').value) || null,
        is_active: document.getElementById('productActive').checked
    };
    
    try {
        if (isEdit) {
            await apiCall(`/products/${productId}`, { method: 'PUT', body: JSON.stringify(productData) });
            showToast('Product updated successfully', 'success');
        } else {
            await apiCall('/products', { method: 'POST', body: JSON.stringify(productData) });
            showToast('Product created successfully', 'success');
        }
        
        closeProductModal();
        await loadProducts();
    } catch (error) {
        console.error('Failed to save product:', error);
        alert(error.message || 'Failed to save product');
    }
}

// ============================================
// DELETE PRODUCT
// ============================================
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        await apiCall(`/products/${productId}`, { method: 'DELETE' });
        showToast('Product deleted successfully', 'success');
        await loadProducts();
    } catch (error) {
        alert(error.message || 'Failed to delete product');
    }
}

// ============================================
// VIEW PRODUCT DETAILS
// ============================================
async function viewProductDetails(productId) {
    try {
        const response = await apiCall(`/products/${productId}`);
        const product = response.data;
        
        let inventoryHtml = '<div class="inventory-list">';
        if (product.inventory && product.inventory.length > 0) {
            inventoryHtml += product.inventory.map(inv => `
                <div class="inventory-item">
                    <strong>${escapeHtml(inv.warehouse_name)}</strong>
                    <span>Quantity: ${inv.quantity}</span>
                </div>
            `).join('');
        } else {
            inventoryHtml += '<p>No inventory records</p>';
        }
        inventoryHtml += '</div>';
        
        const modalHtml = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>${escapeHtml(product.name)}</h2>
                    <button class="close-btn" onclick="closeViewModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="details-grid">
                        <div><strong>SKU:</strong> ${product.sku}</div>
                        <div><strong>Brand:</strong> ${product.brand || '—'}</div>
                        <div><strong>Price:</strong> $${product.price}</div>
                        <div><strong>Cost:</strong> $${product.cost}</div>
                        <div><strong>Margin:</strong> ${calcMargin(product.price, product.cost).toFixed(1)}%</div>
                        <div><strong>Status:</strong> ${product.is_active ? 'Active' : 'Inactive'}</div>
                    </div>
                    <hr>
                    <h4>Inventory</h4>
                    ${inventoryHtml}
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="closeViewModal()">Close</button>
                    <button class="btn btn-primary" onclick="closeViewModal(); openProductModal(${product.id})">Edit</button>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.id = 'viewModal';
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);
    } catch (error) {
        alert('Failed to load product details');
    }
}

function closeViewModal() {
    const modal = document.getElementById('viewModal');
    if (modal) modal.remove();
}

// ============================================
// BULK PRICE UPDATE
// ============================================
async function openBulkPriceModal() {
    document.getElementById('bulkPriceModal').style.display = 'flex';
    await loadProductsForBulkUpdate();
}

function closeBulkPriceModal() {
    document.getElementById('bulkPriceModal').style.display = 'none';
}

async function loadProductsForBulkUpdate() {
    try {
        const response = await apiCall('/products?is_active=true');
        const products = response.data || [];
        
        const container = document.getElementById('bulkProductsList');
        container.innerHTML = products.map(p => `
            <div class="bulk-product-item">
                <span class="product-name">${escapeHtml(p.name)} (${p.sku})</span>
                <span class="current-price">Current: $${parseFloat(p.price).toFixed(2)}</span>
                <input type="number" id="newPrice_${p.id}" class="new-price-input" 
                       placeholder="New price" step="0.01" value="${p.price}">
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load products:', error);
    }
}

async function applyBulkPriceUpdate() {
    const response = await apiCall('/products?is_active=true');
    const products = response.data || [];
    const updates = [];
    
    for (const product of products) {
        const newPriceInput = document.getElementById(`newPrice_${product.id}`);
        if (newPriceInput) {
            const newPrice = parseFloat(newPriceInput.value);
            if (!isNaN(newPrice) && newPrice !== product.price) {
                updates.push({ id: product.id, price: newPrice });
            }
        }
    }
    
    if (updates.length === 0) {
        alert('No price changes detected');
        return;
    }
    
    if (!confirm(`Update prices for ${updates.length} product(s)?`)) return;
    
    try {
        const result = await apiCall('/products/bulk-price', {
            method: 'PUT',
            body: JSON.stringify({ updates })
        });
        showToast(`${result.data.total_updated} products updated`, 'success');
        closeBulkPriceModal();
        await loadProducts();
    } catch (error) {
        alert(error.message || 'Bulk update failed');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function setupEventListeners() {
    const applyFilter = document.getElementById('applyFilter');
    const resetFilter = document.getElementById('resetFilter');
    const searchInput = document.getElementById('filterSearch');
    
    if (applyFilter) applyFilter.addEventListener('click', loadProducts);
    if (resetFilter) {
        resetFilter.addEventListener('click', () => {
            if (document.getElementById('filterCategory')) document.getElementById('filterCategory').value = '';
            if (document.getElementById('filterSupplier')) document.getElementById('filterSupplier').value = '';
            if (searchInput) searchInput.value = '';
            loadProducts();
        });
    }
    if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadProducts(); });
    
    const priceInput = document.getElementById('productPrice');
    const costInput = document.getElementById('productCost');
    if (priceInput) priceInput.addEventListener('input', updateMarginPreview);
    if (costInput) costInput.addEventListener('input', updateMarginPreview);
}

// ============================================
// EXPORT GLOBALS
// ============================================
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.saveProduct = saveProduct;
window.deleteProduct = deleteProduct;
window.viewProductDetails = viewProductDetails;
window.closeViewModal = closeViewModal;
window.openBulkPriceModal = openBulkPriceModal;
window.closeBulkPriceModal = closeBulkPriceModal;
window.applyBulkPriceUpdate = applyBulkPriceUpdate;
window.updateMarginPreview = updateMarginPreview;

console.log('✅ Admin Products module loaded');