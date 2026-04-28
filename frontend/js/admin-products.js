// frontend/js/admin-products.js


// ============================================
// GLOBAL VARIABLES
// ============================================
let productsTable = null;
let currentProductId = null;
let categoriesList = [];
let suppliersList = [];
let warehousesList = [];

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin Products page loading...');
    
    // Check authentication and role
    if (!auth.isLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }
    
    if (!auth.hasRole('admin')) {
        alert('Access denied. Admin privileges required.');
        auth.logout();
        return;
    }
    
    // Initialize header and sidebar
    new Header('appHeader');
    new Sidebar('sidebar', 'products');
    
    // Load all dropdown data
    await loadDropdownData();
    
    // Load products table
    await loadProducts();
    
    // Setup event listeners
    setupEventListeners();
});

// ============================================
// LOAD DROPDOWN DATA (Categories, Suppliers, Warehouses)
// ============================================
async function loadDropdownData() {
    try {
        console.log('Loading dropdown data...');
        
        // Load categories
        const categoriesRes = await apiCall('/categories');
        categoriesList = categoriesRes.data || [];
        populateCategoryDropdowns(categoriesList);
        
        // Load suppliers
        const suppliersRes = await apiCall('/suppliers?is_active=true');
        suppliersList = suppliersRes.data || [];
        populateSupplierDropdowns(suppliersList);
        
        // Load warehouses
        const warehousesRes = await apiCall('/warehouses?is_active=true');
        warehousesList = warehousesRes.data || [];
        populateWarehouseSelect();
        
        console.log('Dropdown data loaded successfully');
    } catch (error) {
        console.error('Failed to load dropdown data:', error);
        showToast('Failed to load form data', 'error');
    }
}

// ============================================
// POPULATE CATEGORY DROPDOWNS (with hierarchy)
// ============================================
function populateCategoryDropdowns(categories) {
    const categorySelect = document.getElementById('productCategory');
    const filterCategory = document.getElementById('filterCategory');
    
    if (!categorySelect) return;
    
    // Build hierarchical options
    const buildOptions = (cats, prefix = '', level = 0) => {
        let html = '';
        for (const cat of cats) {
            if (!cat.parent_id) {
                html += `<option value="${cat.id}">${prefix}${cat.name}</option>`;
                // Add children recursively
                const children = cats.filter(c => c.parent_id === cat.id);
                html += buildOptions(children, prefix + '  └ ', level + 1);
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

// ============================================
// POPULATE SUPPLIER DROPDOWNS
// ============================================
function populateSupplierDropdowns(suppliers) {
    const supplierSelect = document.getElementById('productSupplier');
    const filterSupplier = document.getElementById('filterSupplier');
    
    if (supplierSelect) {
        supplierSelect.innerHTML = '<option value="">Select Supplier</option>' + 
            suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
    }
    
    if (filterSupplier) {
        filterSupplier.innerHTML = '<option value="">All Suppliers</option>' + 
            suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
    }
}

// ============================================
// POPULATE WAREHOUSE SELECT FOR INVENTORY
// ============================================
function populateWarehouseSelect() {
    const warehouseSelect = document.getElementById('inventoryWarehouse');
    if (!warehouseSelect) return;
    
    warehouseSelect.innerHTML = '<option value="">Select Warehouse</option>' + 
        warehousesList.map(w => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('');
}

// ============================================
// LOAD PRODUCTS TABLE
// ============================================
async function loadProducts() {
    try {
        console.log('Loading products...');
        
        // Get filter values
        const categoryId = document.getElementById('filterCategory')?.value || '';
        const supplierId = document.getElementById('filterSupplier')?.value || '';
        const searchTerm = document.getElementById('filterSearch')?.value || '';
        
        // Build query string
        let query = '/products?';
        if (categoryId) query += `category_id=${categoryId}&`;
        if (supplierId) query += `supplier_id=${supplierId}&`;
        if (searchTerm) query += `search=${encodeURIComponent(searchTerm)}&`;
        
        const response = await apiCall(query);
        const products = response.data || [];
        
        // Format data for table
        const formattedProducts = products.map(p => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            brand: p.brand || '—',
            price: `$${parseFloat(p.price).toFixed(2)}`,
            cost: `$${parseFloat(p.cost).toFixed(2)}`,
            profit_margin: p.profit_margin ? `${p.profit_margin.toFixed(1)}%` : '—',
            status: p.is_active ? 
                '<span class="badge badge-success">Active</span>' : 
                '<span class="badge badge-danger">Inactive</span>'
        }));
        
        // Define table columns
        const columns = [
            { key: 'id', label: 'ID' },
            { key: 'sku', label: 'SKU' },
            { key: 'name', label: 'Product Name' },
            { key: 'brand', label: 'Brand' },
            { key: 'price', label: 'Price' },
            { key: 'cost', label: 'Cost' },
            { key: 'profit_margin', label: 'Margin' },
            { key: 'status', label: 'Status' }
        ];
        
        // Create or update table
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
        
        console.log(`Loaded ${products.length} products`);
        
    } catch (error) {
        console.error('Failed to load products:', error);
        document.getElementById('productsTable').innerHTML = 
            '<div class="error-state">Failed to load products. Please refresh.</div>';
    }
}

// ============================================
// VIEW PRODUCT DETAILS (with inventory)
// ============================================
async function viewProductDetails(productId) {
    try {
        const response = await apiCall(`/products/${productId}`);
        const product = response.data;
        
        // Build inventory HTML
        let inventoryHtml = '<div class="inventory-list">';
        if (product.inventory && product.inventory.length > 0) {
            inventoryHtml += product.inventory.map(inv => `
                <div class="inventory-item">
                    <strong>${escapeHtml(inv.warehouse_name)}</strong>
                    <span>Quantity: ${inv.quantity}</span>
                </div>
            `).join('');
        } else {
            inventoryHtml += '<p>No inventory records found</p>';
        }
        inventoryHtml += '</div>';
        
        // Show modal with details
        const modalHtml = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>Product Details: ${escapeHtml(product.name)}</h2>
                    <button class="close-btn" onclick="closeViewModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="details-grid">
                        <div><strong>SKU:</strong> ${product.sku}</div>
                        <div><strong>Brand:</strong> ${product.brand || '—'}</div>
                        <div><strong>Price:</strong> $${parseFloat(product.price).toFixed(2)}</div>
                        <div><strong>Cost:</strong> $${parseFloat(product.cost).toFixed(2)}</div>
                        <div><strong>Profit Margin:</strong> ${product.profit_margin?.toFixed(1) || '0'}%</div>
                        <div><strong>Status:</strong> ${product.is_active ? 'Active' : 'Inactive'}</div>
                    </div>
                    <hr>
                    <h3>Inventory by Warehouse</h3>
                    ${inventoryHtml}
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="closeViewModal()">Close</button>
                    <button class="btn btn-primary" onclick="closeViewModal(); openProductModal(${product.id})">Edit Product</button>
                </div>
            </div>
        `;
        
        // Create and show modal
        const modal = document.createElement('div');
        modal.id = 'viewModal';
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Failed to load product details:', error);
        alert('Failed to load product details');
    }
}

// ============================================
// CLOSE VIEW MODAL
// ============================================
function closeViewModal() {
    const modal = document.getElementById('viewModal');
    if (modal) modal.remove();
}

// ============================================
// OPEN PRODUCT MODAL (Add/Edit)
// ============================================
async function openProductModal(productId = null) {
    currentProductId = productId;
    const modal = document.getElementById('productModal');
    const isEdit = productId !== null;
    
    // Reset form
    document.getElementById('productForm').reset();
    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Product' : 'Add Product';
    document.getElementById('productId').value = '';
    
    // Show/hide password field for edit
    const inventorySection = document.getElementById('inventorySection');
    if (inventorySection) {
        inventorySection.style.display = isEdit ? 'block' : 'none';
    }
    
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
            
        } catch (error) {
            console.error('Failed to load product:', error);
            alert('Failed to load product data');
            return;
        }
    }
    
    modal.style.display = 'flex';
}

// ============================================
// CLOSE PRODUCT MODAL
// ============================================
function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    currentProductId = null;
}

// ============================================
// SAVE PRODUCT (Create or Update)
// ============================================
async function saveProduct() {
    const productId = document.getElementById('productId').value;
    const isEdit = productId !== '';
    
    // Validate required fields
    const name = document.getElementById('productName').value.trim();
    const sku = document.getElementById('productSku').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const cost = parseFloat(document.getElementById('productCost').value);
    
    if (!name) {
        alert('Product name is required');
        return;
    }
    if (!sku) {
        alert('SKU is required');
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
        name: name,
        sku: sku,
        price: price,
        cost: cost,
        brand: document.getElementById('productBrand').value || null,
        description: document.getElementById('productDescription').value || null,
        category_id: parseInt(document.getElementById('productCategory').value) || null,
        supplier_id: parseInt(document.getElementById('productSupplier').value) || null,
        is_active: document.getElementById('productActive').checked
    };
    
    try {
        let response;
        if (isEdit) {
            response = await apiCall(`/products/${productId}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
            showToast('Product updated successfully', 'success');
        } else {
            response = await apiCall('/products', {
                method: 'POST',
                body: JSON.stringify(productData)
            });
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
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        return;
    }
    
    try {
        await apiCall(`/products/${productId}`, { method: 'DELETE' });
        showToast('Product deleted successfully', 'success');
        await loadProducts();
    } catch (error) {
        console.error('Failed to delete product:', error);
        alert(error.message || 'Failed to delete product');
    }
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
        console.error('Failed to load products for bulk update:', error);
    }
}

async function applyBulkPriceUpdate() {
    const products = await apiCall('/products?is_active=true');
    const updates = [];
    
    for (const product of (products.data || [])) {
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
    
    if (!confirm(`Update prices for ${updates.length} product(s)?`)) {
        return;
    }
    
    try {
        const response = await apiCall('/products/bulk-price', {
            method: 'PUT',
            body: JSON.stringify({ updates: updates })
        });
        
        showToast(`${response.data.total_updated} products updated successfully`, 'success');
        closeBulkPriceModal();
        await loadProducts();
        
    } catch (error) {
        console.error('Bulk price update failed:', error);
        alert(error.message || 'Failed to update prices');
    }
}

// ============================================
// ADD INVENTORY TO PRODUCT
// ============================================
function addInventoryToProduct() {
    const warehouseId = document.getElementById('inventoryWarehouse').value;
    const quantity = parseInt(document.getElementById('inventoryQuantity').value);
    
    if (!warehouseId) {
        alert('Please select a warehouse');
        return;
    }
    if (isNaN(quantity) || quantity <= 0) {
        alert('Please enter a valid quantity');
        return;
    }
    
    // This would call the inventory receive endpoint
    // For now, just show a message
    alert(`Add ${quantity} units to warehouse ID ${warehouseId} for product ID ${currentProductId}`);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showToast(message, type = 'info') {
    // Create toast element if it doesn't exist
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

function setupEventListeners() {
    // Filter buttons
    const applyFilterBtn = document.getElementById('applyFilter');
    const resetFilterBtn = document.getElementById('resetFilter');
    
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', loadProducts);
    }
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
            document.getElementById('filterCategory').value = '';
            document.getElementById('filterSupplier').value = '';
            document.getElementById('filterSearch').value = '';
            loadProducts();
        });
    }
    
    // Enter key on search
    const searchInput = document.getElementById('filterSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadProducts();
        });
    }
}

// ============================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
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
window.addInventoryToProduct = addInventoryToProduct;

console.log('✅ Admin Products module loaded');
