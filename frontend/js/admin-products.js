// frontend/js/admin-products.js

// ============================================
// GLOBAL VARIABLES
// ============================================
let productsTable = null;
let currentProductId = null;
let categoriesList = [];
let suppliersList = [];
let warehousesList = [];
let viewMode = 'table';

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
// LOAD DROPDOWN DATA (Categories, Suppliers, Warehouses)
// ============================================
async function loadDropdownData() {
    try {
        // Load categories from database
        const categoriesRes = await apiCall('/categories');
        categoriesList = categoriesRes.data || [];
        populateCategoryDropdowns(categoriesList);
        
        // Load suppliers from database
        const suppliersRes = await apiCall('/suppliers?is_active=true');
        suppliersList = suppliersRes.data || [];
        populateSupplierDropdowns(suppliersList);
        
        // Load warehouses from database for inventory section
        const warehousesRes = await apiCall('/warehouses?is_active=true');
        warehousesList = warehousesRes.data || [];
        populateWarehouseDropdown();
        
    } catch (error) {
        console.error('Failed to load dropdown data:', error);
    }
}

function populateCategoryDropdowns(categories) {
    const categorySelect = document.getElementById('productCategory');
    const filterCategory = document.getElementById('filterCategory');
    
    const buildOptions = (cats, prefix = '', level = 0) => {
        let html = '';
        for (const cat of cats) {
            if (!cat.parent_id) {
                const indent = '  '.repeat(level);
                const displayName = level > 0 ? `${indent}└ ${cat.name}` : cat.name;
                html += `<option value="${cat.id}">${escapeHtml(displayName)}</option>`;
                const children = categories.filter(c => c.parent_id === cat.id);
                html += buildOptions(children, prefix, level + 1);
            }
        }
        return html;
    };
    
    const options = buildOptions(categories);
    
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">-- Select Category --</option>' + options;
    }
    if (filterCategory) {
        filterCategory.innerHTML = '<option value="">All Categories</option>' + options;
    }
}

function populateSupplierDropdowns(suppliers) {
    const supplierSelect = document.getElementById('productSupplier');
    const filterSupplier = document.getElementById('filterSupplier');
    
    const options = '<option value="">-- Select Supplier --</option>' +
        suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
    
    if (supplierSelect) supplierSelect.innerHTML = options;
    if (filterSupplier) filterSupplier.innerHTML = '<option value="">All Suppliers</option>' + options;
}

function populateWarehouseDropdown() {
    const warehouseSelect = document.getElementById('inventoryWarehouse');
    if (warehouseSelect) {
        warehouseSelect.innerHTML = '<option value="">-- Select Warehouse --</option>' +
            warehousesList.map(w => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('');
    }
}

// ============================================
// MARGIN CALCULATION (business logic only, not stored)
// ============================================
function calcMargin(price, cost) {
    if (!price || price === 0) return 0;
    return ((price - cost) / price) * 100;
}

function getMarginBadgeClass(margin) {
    if (margin >= 40) return 'badge-success';
    if (margin >= 20) return 'badge-warning';
    return 'badge-danger';
}

function updateMarginPreview() {
    const priceInput = document.getElementById('productPrice');
    const costInput = document.getElementById('productCost');
    const price = parseFloat(priceInput?.value) || 0;
    const cost = parseFloat(costInput?.value) || 0;
    const preview = document.getElementById('marginPreview');
    
    if (price > 0) {
        if (preview) preview.style.display = 'block';
        
        const margin = ((price - cost) / price) * 100;
        const profit = price - cost;
        const markup = cost > 0 ? ((price - cost) / cost) * 100 : 0;
        
        const marginElement = document.getElementById('previewMargin');
        const profitElement = document.getElementById('previewProfit');
        const markupElement = document.getElementById('previewMarkup');
        
        if (marginElement) {
            marginElement.textContent = margin.toFixed(1) + '%';
            marginElement.className = `mp-val ${margin >= 40 ? 'good' : margin >= 20 ? 'warn' : 'bad'}`;
        }
        if (profitElement) profitElement.textContent = '$' + profit.toFixed(2);
        if (markupElement) markupElement.textContent = markup.toFixed(1) + '%';
        
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
        
        let query = '/products?is_active=true';
        if (categoryId) query += `&category_id=${categoryId}`;
        if (supplierId) query += `&supplier_id=${supplierId}`;
        if (searchTerm) query += `&search=${encodeURIComponent(searchTerm)}`;
        
        const response = await apiCall(query);
        let products = response.data || [];
        
        // For each product, get inventory to show stock count
        for (let i = 0; i < products.length; i++) {
            try {
                const productDetail = await apiCall(`/products/${products[i].id}`);
                products[i].inventory = productDetail.data.inventory || [];
                products[i].total_stock = products[i].inventory.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
            } catch (e) {
                products[i].total_stock = 0;
            }
        }
        
        updateProductStats(products);
        
        if (viewMode === 'card') {
            displayProductsCardView(products);
        } else {
            displayProductsTableView(products);
        }
        
    } catch (error) {
        console.error('Failed to load products:', error);
        const container = document.getElementById('productsTable');
        if (container) container.innerHTML = '<div class="error-state">Failed to load products</div>';
    }
}

function displayProductsTableView(products) {
    const formattedProducts = products.map(p => {
        const margin = calcMargin(p.price, p.cost);
        const stockClass = p.total_stock <= 0 ? 'stock-out' : p.total_stock <= 10 ? 'stock-low' : 'stock-ok';
        
        return {
            id: p.id,
            name: `<div class="product-name">${escapeHtml(p.name)}</div>${p.description ? `<div class="product-desc">${escapeHtml(p.description.substring(0, 50))}</div>` : ''}`,
            sku: `<span class="mono">${escapeHtml(p.sku)}</span>`,
            brand: escapeHtml(p.brand || '—'),
            category: escapeHtml(p.category_name || '—'),
            price: `$${parseFloat(p.price).toFixed(2)}`,
            cost: `$${parseFloat(p.cost).toFixed(2)}`,
            stock: `<span class="${stockClass}">${p.total_stock}</span>`,
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
        { key: 'stock', label: 'Stock' },
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
}

function displayProductsCardView(products) {
    const container = document.getElementById('productsTable');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state">No products found</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="products-card-grid">
            ${products.map(product => {
                const stockClass = product.total_stock <= 0 ? 'out' : product.total_stock <= 10 ? 'low' : 'ok';
                const stockText = product.total_stock <= 0 ? 'Out of Stock' : product.total_stock <= 10 ? `Low: ${product.total_stock}` : `${product.total_stock} units`;
                
                return `
                    <div class="product-card">
                        <div class="card-header">
                            <h3 class="product-name">${escapeHtml(product.name)}</h3>
                            <span class="product-sku">${escapeHtml(product.sku)}</span>
                        </div>
                        <div class="card-body">
                            ${product.brand ? `<div class="product-brand">${escapeHtml(product.brand)}</div>` : ''}
                            <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
                            <div class="product-stock stock-${stockClass}">📦 ${stockText}</div>
                            <div class="product-margin ${calcMargin(product.price, product.cost) >= 40 ? 'good' : calcMargin(product.price, product.cost) >= 20 ? 'warn' : 'bad'}">
                                Margin: ${calcMargin(product.price, product.cost).toFixed(1)}%
                            </div>
                        </div>
                        <div class="card-footer">
                            <button class="btn-sm" onclick="editProduct(${product.id})">Edit</button>
                            <button class="btn-sm btn-danger" onclick="deleteProduct(${product.id})">Delete</button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
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

function toggleViewMode() {
    const toggleBtn = document.getElementById('viewToggle');
    viewMode = viewMode === 'table' ? 'card' : 'table';
    
    if (toggleBtn) {
        toggleBtn.textContent = viewMode === 'table' ? '📋 Table View' : '🃏 Card View';
    }
    
    loadProducts();
}

// ============================================
// INVENTORY MANAGEMENT (Using existing DB fields)
// ============================================
let inventoryItems = [];

function addInventoryRow(warehouseId = null, quantity = 0) {
    const container = document.getElementById('inventoryRowsContainer');
    const rowId = Date.now();
    
    const warehouseOptions = warehousesList.map(w => 
        `<option value="${w.id}" ${warehouseId === w.id ? 'selected' : ''}>${escapeHtml(w.name)}</option>`
    ).join('');
    
    const row = document.createElement('div');
    row.className = 'inventory-row';
    row.dataset.rowId = rowId;
    row.innerHTML = `
        <div class="inventory-row-fields">
            <select class="inv-warehouse-select" data-row="${rowId}" style="flex: 2;">
                <option value="">-- Select Warehouse --</option>
                ${warehouseOptions}
            </select>
            <input type="number" class="inv-quantity" placeholder="Quantity" value="${quantity}" min="0" style="flex: 1;">
            <button type="button" class="btn-icon remove-inventory-row" title="Remove" style="margin-left: 8px;">✖</button>
        </div>
    `;
    
    container.appendChild(row);
}

function removeInventoryRow(btn) {
    const row = btn.closest('.inventory-row');
    if (row && document.querySelectorAll('.inventory-row').length > 1) {
        row.remove();
    } else {
        showToast('Product must have at least one inventory entry', 'error');
    }
}

async function loadExistingInventory(productId) {
    try {
        const response = await apiCall(`/products/${productId}`);
        const product = response.data;
        const inventory = product.inventory || [];
        
        const container = document.getElementById('inventoryRowsContainer');
        container.innerHTML = '';
        
        if (inventory.length === 0) {
            addInventoryRow();
        } else {
            for (const inv of inventory) {
                addInventoryRow(inv.warehouse_id, inv.quantity);
            }
        }
        
    } catch (error) {
        console.error('Failed to load inventory:', error);
        addInventoryRow();
    }
}

// ============================================
// OPEN PRODUCT MODAL (Add/Edit - SAME FIELDS)
// ============================================
async function openProductModal(productId = null) {
    currentProductId = productId;
    const modal = document.getElementById('productModal');
    const isEdit = productId !== null;
    
    // Reset form
    document.getElementById('productForm').reset();
    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Product' : 'Add Product';
    document.getElementById('productId').value = '';
    
    // Reset inventory rows
    const inventoryContainer = document.getElementById('inventoryRowsContainer');
    if (inventoryContainer) inventoryContainer.innerHTML = '';
    
    // Reset preview
    const marginPreview = document.getElementById('marginPreview');
    if (marginPreview) marginPreview.style.display = 'none';
    
    // Show inventory section for BOTH add and edit
    const inventorySection = document.getElementById('inventorySection');
    if (inventorySection) inventorySection.style.display = 'block';
    
    if (isEdit) {
        try {
            const response = await apiCall(`/products/${productId}`);
            const product = response.data;
            
            // Fill basic product info (matches database fields exactly)
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
            
            // Load existing inventory (from inventory table)
            await loadExistingInventory(productId);
            
        } catch (error) {
            console.error('Failed to load product:', error);
            showToast('Failed to load product data', 'error');
            return;
        }
    } else {
        // For new product, add one empty inventory row
        addInventoryRow();
    }
    
    // Setup validation listeners
    const priceInput = document.getElementById('productPrice');
    const costInput = document.getElementById('productCost');
    if (priceInput) priceInput.addEventListener('input', updateMarginPreview);
    if (costInput) costInput.addEventListener('input', updateMarginPreview);
    
    modal.style.display = 'flex';
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    currentProductId = null;
}

// ============================================
// SAVE PRODUCT (Only uses existing DB fields)
// ============================================
async function saveProduct() {
    const productId = document.getElementById('productId').value;
    const isEdit = productId !== '';
    
    // Validate basic product info
    const name = document.getElementById('productName').value.trim();
    const sku = document.getElementById('productSku').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const cost = parseFloat(document.getElementById('productCost').value);
    
    if (!name || name.length < 2) {
        showToast('Product name must be at least 2 characters', 'error');
        document.getElementById('productName').focus();
        return;
    }
    
    if (!sku || sku.length < 2) {
        showToast('SKU must be at least 2 characters', 'error');
        document.getElementById('productSku').focus();
        return;
    }
    
    if (isNaN(price) || price < 0) {
        showToast('Valid price is required', 'error');
        document.getElementById('productPrice').focus();
        return;
    }
    
    if (isNaN(cost) || cost < 0) {
        showToast('Valid cost is required', 'error');
        document.getElementById('productCost').focus();
        return;
    }
    
    if (cost > price) {
        showToast('Cost cannot be greater than price', 'error');
        document.getElementById('productCost').focus();
        return;
    }
    
    // Collect inventory data (to be saved to inventory table)
    const inventoryRows = document.querySelectorAll('.inventory-row');
    const inventoryData = [];
    
    for (const row of inventoryRows) {
        const warehouseId = row.querySelector('.inv-warehouse-select').value;
        const quantity = parseInt(row.querySelector('.inv-quantity').value) || 0;
        
        if (!warehouseId) {
            showToast('Please select a warehouse for all inventory entries', 'error');
            return;
        }
        
        if (quantity > 0) {
            inventoryData.push({
                warehouse_id: parseInt(warehouseId),
                quantity: quantity
            });
        }
    }
    
    // Build product data - ONLY fields that exist in products table
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
        showToast(isEdit ? 'Updating product...' : 'Creating product...', 'info');
        
        let response;
        if (isEdit) {
            response = await apiCall(`/products/${productId}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
        } else {
            response = await apiCall('/products', {
                method: 'POST',
                body: JSON.stringify(productData)
            });
        }
        
        if (response.success) {
            const savedProductId = response.data.id;
            
            // Handle inventory updates - ONLY for inventory table fields
            for (const inv of inventoryData) {
                try {
                    // Check if inventory record exists
                    const existingInv = await apiCall(`/inventory/warehouse/${inv.warehouse_id}`);
                    const existing = existingInv.data?.find(i => i.product_id === parseInt(savedProductId));
                    
                    if (existing) {
                        // Update existing inventory
                        await apiCall('/inventory/adjust', {
                            method: 'POST',
                            body: JSON.stringify({
                                product_id: parseInt(savedProductId),
                                warehouse_id: inv.warehouse_id,
                                new_quantity: inv.quantity,
                                reason_code: 'ADMIN_UPDATE',
                                notes: 'Admin updated product inventory'
                            })
                        });
                    } else if (inv.quantity > 0) {
                        // Create new inventory record - only fields in inventory table
                        await apiCall('/inventory/receive', {
                            method: 'POST',
                            body: JSON.stringify({
                                product_id: parseInt(savedProductId),
                                warehouse_id: inv.warehouse_id,
                                quantity: inv.quantity,
                                reason: 'Initial stock setup'
                            })
                        });
                    }
                } catch (invError) {
                    console.error('Failed to update inventory:', invError);
                }
            }
            
            showToast(isEdit ? 'Product updated successfully' : 'Product created successfully', 'success');
            closeProductModal();
            await loadProducts();
        } else {
            throw new Error(response.error);
        }
        
    } catch (error) {
        console.error('Failed to save product:', error);
        showToast(error.message || 'Failed to save product', 'error');
    }
}

// ============================================
// DELETE PRODUCT
// ============================================
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This will also remove its inventory records.')) return;
    
    try {
        await apiCall(`/products/${productId}`, { method: 'DELETE' });
        showToast('Product deleted successfully', 'success');
        await loadProducts();
    } catch (error) {
        showToast(error.message || 'Failed to delete product', 'error');
    }
}

// ============================================
// VIEW PRODUCT DETAILS (Using existing DB data)
// ============================================
async function viewProductDetails(productId) {
    try {
        const response = await apiCall(`/products/${productId}`);
        const product = response.data;
        
        let inventoryHtml = '<div class="inventory-list">';
        if (product.inventory && product.inventory.length > 0) {
            for (const inv of product.inventory) {
                const warehouse = warehousesList.find(w => w.id === inv.warehouse_id);
                const warehouseName = warehouse ? warehouse.name : `Warehouse #${inv.warehouse_id}`;
                
                inventoryHtml += `
                    <div class="inventory-item">
                        <strong>${escapeHtml(warehouseName)}</strong>: ${inv.quantity} units
                    </div>
                `;
            }
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
                        <div><strong>Category:</strong> ${product.category_name || '—'}</div>
                        <div><strong>Supplier:</strong> ${product.supplier_name || '—'}</div>
                        <div><strong>Price:</strong> $${parseFloat(product.price).toFixed(2)}</div>
                        <div><strong>Cost:</strong> $${parseFloat(product.cost).toFixed(2)}</div>
                        <div><strong>Margin:</strong> ${calcMargin(product.price, product.cost).toFixed(1)}%</div>
                        <div><strong>Status:</strong> ${product.is_active ? 'Active' : 'Inactive'}</div>
                    </div>
                    ${product.description ? `<hr><div><strong>Description:</strong><br>${escapeHtml(product.description)}</div>` : ''}
                    <hr>
                    <h4>📦 Inventory</h4>
                    ${inventoryHtml}
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="closeViewModal()">Close</button>
                    <button class="btn btn-primary" onclick="closeViewModal(); openProductModal(${product.id})">Edit Product</button>
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
        console.error('Failed to load product details:', error);
        showToast('Failed to load product details', 'error');
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
                       placeholder="0.00" step="0.01" min="0" value="${p.price}">
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
            if (!isNaN(newPrice) && newPrice !== product.price && newPrice >= 0) {
                updates.push({ id: product.id, price: newPrice });
            }
        }
    }
    
    if (updates.length === 0) {
        showToast('No price changes detected', 'info');
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
        showToast(error.message || 'Bulk update failed', 'error');
    }
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    const applyFilter = document.getElementById('applyFilter');
    const resetFilter = document.getElementById('resetFilter');
    const searchInput = document.getElementById('filterSearch');
    const addInventoryBtn = document.getElementById('addInventoryBtn');
    
    if (applyFilter) applyFilter.addEventListener('click', loadProducts);
    if (resetFilter) {
        resetFilter.addEventListener('click', () => {
            if (document.getElementById('filterCategory')) document.getElementById('filterCategory').value = '';
            if (document.getElementById('filterSupplier')) document.getElementById('filterSupplier').value = '';
            if (searchInput) searchInput.value = '';
            loadProducts();
        });
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadProducts();
        });
    }
    if (addInventoryBtn) {
        addInventoryBtn.addEventListener('click', () => addInventoryRow());
    }
    
    // Delegate remove inventory row events
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-inventory-row')) {
            removeInventoryRow(e.target);
        }
    });
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
window.toggleViewMode = toggleViewMode;
window.editProduct = (id) => openProductModal(id);
window.addInventoryRow = addInventoryRow;

console.log('✅ Admin Products module loaded');