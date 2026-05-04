// frontend/js/admin-products.js

// ============================================
// GLOBAL VARIABLES
// ============================================
let productsTable = null;
let currentProductId = null;
let categoriesList = [];
let suppliersList = [];
let viewMode = 'table'; // 'table' or 'card'

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

function getMarginClass(margin) {
    if (margin >= 40) return 'good';
    if (margin >= 20) return 'warn';
    return 'bad';
}

// ============================================
// UPDATE MARGIN PREVIEW (NEW from Version B)
// ============================================
// Enhanced margin preview with validation
function updateMarginPreview() {
    const priceInput = document.getElementById('productPrice');
    const costInput = document.getElementById('productCost');
    const price = parseFloat(priceInput?.value) || 0;
    const cost = parseFloat(costInput?.value) || 0;
    const preview = document.getElementById('marginPreview');
    const warningDiv = document.getElementById('validationWarning');
    const warningMessage = document.getElementById('validationMessage');
    
    // Reset validation styles
    if (priceInput) priceInput.classList.remove('field-error', 'field-success');
    if (costInput) costInput.classList.remove('field-error', 'field-success');
    
    const priceError = document.getElementById('priceError');
    const costError = document.getElementById('costError');
    if (priceError) priceError.style.display = 'none';
    if (costError) costError.style.display = 'none';
    
    let isValid = true;
    let warningText = '';
    
    // Validation 1: Price cannot be negative
    if (price < 0) {
        isValid = false;
        warningText = 'Price cannot be negative.';
        if (priceInput) {
            priceInput.classList.add('field-error');
            if (priceError) {
                priceError.textContent = 'Price cannot be negative';
                priceError.style.display = 'block';
            }
        }
    }
    
    // Validation 2: Cost cannot be negative
    if (cost < 0) {
        isValid = false;
        warningText = warningText || 'Cost cannot be negative.';
        if (costInput) {
            costInput.classList.add('field-error');
            if (costError) {
                costError.textContent = 'Cost cannot be negative';
                costError.style.display = 'block';
            }
        }
    }
    
    // Validation 3: Cost cannot exceed price (if both are positive)
    if (cost > price && price > 0) {
        isValid = false;
        warningText = warningText || 'Cost cannot be greater than price.';
        if (costInput) costInput.classList.add('field-error');
        if (priceInput) priceInput.classList.add('field-error');
        if (costError) {
            costError.textContent = 'Cost cannot exceed price ($' + price.toFixed(2) + ')';
            costError.style.display = 'block';
        }
    }
    
    // Show/hide warning
    if (warningDiv && warningMessage) {
        if (!isValid) {
            warningMessage.textContent = warningText;
            warningDiv.style.display = 'block';
        } else {
            warningDiv.style.display = 'none';
        }
    }
    
    // Show margin preview only if valid
    if (price > 0 && isValid) {
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
        
        // Add success styling for valid inputs
        if (priceInput && price > 0) priceInput.classList.add('field-success');
        if (costInput && cost > 0 && cost <= price) costInput.classList.add('field-success');
        
    } else if (preview) {
        preview.style.display = 'none';
    }
    
    return isValid;
}

// Price/Cost specific validators
function validatePrice() {
    const priceInput = document.getElementById('productPrice');
    const priceError = document.getElementById('priceError');
    
    if (!priceInput) return true;
    
    const price = parseFloat(priceInput.value);
    
    if (isNaN(price)) {
        if (priceError) {
            priceError.textContent = 'Please enter a valid price';
            priceError.style.display = 'block';
        }
        priceInput.classList.add('field-error');
        return false;
    }
    
    if (price < 0) {
        if (priceError) {
            priceError.textContent = 'Price cannot be negative';
            priceError.style.display = 'block';
        }
        priceInput.classList.add('field-error');
        return false;
    }
    
    if (priceError) priceError.style.display = 'none';
    return true;
}

function validateCost() {
    const costInput = document.getElementById('productCost');
    const priceInput = document.getElementById('productPrice');
    const costError = document.getElementById('costError');
    
    if (!costInput) return true;
    
    const cost = parseFloat(costInput.value);
    const price = parseFloat(priceInput?.value) || 0;
    
    if (isNaN(cost)) {
        if (costError) {
            costError.textContent = 'Please enter a valid cost';
            costError.style.display = 'block';
        }
        costInput.classList.add('field-error');
        return false;
    }
    
    if (cost < 0) {
        if (costError) {
            costError.textContent = 'Cost cannot be negative';
            costError.style.display = 'block';
        }
        costInput.classList.add('field-error');
        return false;
    }
    
    if (price > 0 && cost > price) {
        if (costError) {
            costError.textContent = `Cost cannot exceed price ($${price.toFixed(2)})`;
            costError.style.display = 'block';
        }
        costInput.classList.add('field-error');
        return false;
    }
    
    if (costError) costError.style.display = 'none';
    return true;
}

// Add input event listeners for real-time validation
function setupPriceCostValidation() {
    const priceInput = document.getElementById('productPrice');
    const costInput = document.getElementById('productCost');
    
    if (priceInput) {
        priceInput.addEventListener('input', () => {
            validatePrice();
            updateMarginPreview();
        });
        priceInput.addEventListener('blur', validatePrice);
    }
    
    if (costInput) {
        costInput.addEventListener('input', () => {
            validateCost();
            updateMarginPreview();
        });
        costInput.addEventListener('blur', validateCost);
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
        
        updateProductStats(products);
        
        // Route to appropriate view based on viewMode
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

// ============================================
// TABLE VIEW (DataTable)
// ============================================
function displayProductsTableView(products) {
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
}

// ============================================
// CARD VIEW
// ============================================
function displayProductsCardView(products) {
    const container = document.getElementById('productsTable');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state">No products found</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="products-card-grid">
            ${products.map(product => `
                <div class="product-card">
                    <div class="card-header">
                        <h3 class="product-name">${escapeHtml(product.name)}</h3>
                        <span class="product-sku">${escapeHtml(product.sku)}</span>
                    </div>
                    <div class="card-body">
                        ${product.brand ? `<div class="product-brand">${escapeHtml(product.brand)}</div>` : ''}
                        <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
                        <div class="product-margin ${getMarginClass(calcMargin(product.price, product.cost))}">
                            Margin: ${calcMargin(product.price, product.cost).toFixed(1)}%
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn-sm" onclick="editProduct(${product.id})">Edit</button>
                        <button class="btn-sm btn-danger" onclick="deleteProduct(${product.id})">Delete</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Add CSS for card grid if not present
    if (!document.querySelector('#cardGridStyles')) {
        const style = document.createElement('style');
        style.id = 'cardGridStyles';
        style.textContent = `
            .products-card-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 20px;
                padding: 16px;
            }
            .product-card {
                background: var(--surface, #ffffff);
                border: 1px solid var(--border, #e2e8f0);
                border-radius: 12px;
                padding: 16px;
                transition: all 0.2s;
                display: flex;
                flex-direction: column;
            }
            .product-card:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
            }
            .product-card .card-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 12px;
                padding: 0;
                background: none;
                border: none;
            }
            .product-card .card-header h3 {
                margin: 0;
                font-size: 1rem;
                font-weight: 600;
            }
            .product-card .card-body {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 12px;
            }
            .product-card .card-footer {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
                padding-top: 12px;
                border-top: 1px solid var(--border-light, #e2e8f0);
            }
            .product-sku {
                font-family: 'DM Mono', monospace;
                font-size: 0.75rem;
                color: var(--text-muted, #64748b);
                background: var(--bg-tertiary, #f1f5f9);
                padding: 2px 6px;
                border-radius: 4px;
            }
            .product-brand {
                font-size: 0.875rem;
                color: var(--text-secondary, #475569);
            }
            .product-price {
                font-size: 1.25rem;
                font-weight: 700;
                color: var(--text-primary, #1e293b);
            }
            .product-margin {
                font-size: 0.875rem;
                font-weight: 500;
            }
            .product-margin.good { color: var(--success, #16a34a); }
            .product-margin.warn { color: var(--warning, #ca8a04); }
            .product-margin.bad { color: var(--danger, #dc2626); }
            .btn-sm {
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 0.8rem;
                border: 1px solid var(--border, #e2e8f0);
                background: var(--surface, #ffffff);
                cursor: pointer;
                transition: all 0.2s;
            }
            .btn-sm:hover {
                background: var(--bg-tertiary, #f1f5f9);
            }
            .btn-sm.btn-danger {
                color: var(--danger, #dc2626);
                border-color: var(--danger, #dc2626);
            }
            .btn-sm.btn-danger:hover {
                background: var(--danger, #dc2626);
                color: white;
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================
// TOGGLE VIEW MODE
// ============================================
function toggleViewMode() {
    const toggleBtn = document.getElementById('viewToggle');
    viewMode = viewMode === 'table' ? 'card' : 'table';
    
    if (toggleBtn) {
        toggleBtn.textContent = viewMode === 'table' ? '📋 Table View' : '🃏 Card View';
    }
    
    loadProducts(); // Reload with new view mode
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
    
    // Reset validation UI
    const warningDiv = document.getElementById('validationWarning');
    if (warningDiv) warningDiv.style.display = 'none';
    
    const priceError = document.getElementById('priceError');
    const costError = document.getElementById('costError');
    if (priceError) priceError.style.display = 'none';
    if (costError) costError.style.display = 'none';
    
    const priceInput = document.getElementById('productPrice');
    const costInput = document.getElementById('productCost');
    if (priceInput) priceInput.classList.remove('field-error', 'field-success');
    if (costInput) costInput.classList.remove('field-error', 'field-success');
    
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
            
            // Setup validation and update preview
            setupPriceCostValidation();
            updateMarginPreview();
            
        } catch (error) {
            console.error('Failed to load product:', error);
            alert('Failed to load product data');
            return;
        }
    } else {
        // For new product, also setup validation
        setupPriceCostValidation();
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
    
    // Run all validations
    const isPriceValid = validatePrice();
    const isCostValid = validateCost();
    const isMarginValid = updateMarginPreview();
    
    if (!isPriceValid || !isCostValid || !isMarginValid) {
        showToast('Please fix validation errors before saving', 'error');
        return;
    }
    
    const name = document.getElementById('productName').value.trim();
    const sku = document.getElementById('productSku').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const cost = parseFloat(document.getElementById('productCost').value);
    
    // Additional name/sku validation
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
        document.getElementById('productCost').focus;
        return;
    }
    
    if (cost > price) {
        showToast('Cost cannot be greater than price', 'error');
        document.getElementById('productCost').focus();
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
            await apiCall(`/products/${productId}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
            showToast('Product updated successfully', 'success');
        } else {
            await apiCall('/products', {
                method: 'POST',
                body: JSON.stringify(productData)
            });
            showToast('Product created successfully', 'success');
        }
        
        closeProductModal();
        await loadProducts();
        
    } catch (error) {
        console.error('Failed to save product:', error);
        showToast(error.message || 'Failed to save product', 'error');
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
                       placeholder="0.00" step="0.01" min="0" required value="${p.price}">
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
    let hasError = false;
    
    for (const product of products) {
        const newPriceInput = document.getElementById(`newPrice_${product.id}`);
        if (newPriceInput) {
            const newPrice = parseFloat(newPriceInput.value);
            
            // Validate price
            if (isNaN(newPrice)) {
                showToast(`Invalid price for ${product.name}`, 'error');
                hasError = true;
                continue;
            }
            
            if (newPrice < 0) {
                showToast(`Price cannot be negative for ${product.name}`, 'error');
                hasError = true;
                continue;
            }
            
            if (newPrice !== product.price) {
                updates.push({ id: product.id, price: newPrice });
            }
        }
    }
    
    if (hasError) {
        showToast('Please fix validation errors', 'error');
        return;
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
    
    // Price/Cost validation event listeners are now set up in openProductModal via setupPriceCostValidation()
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
window.validatePrice = validatePrice;
window.validateCost = validateCost;
window.toggleViewMode = toggleViewMode;
window.editProduct = (id) => openProductModal(id);

console.log('✅ Admin Products module loaded');