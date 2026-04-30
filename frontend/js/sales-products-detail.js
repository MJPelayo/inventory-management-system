// Sales Product Detail Page JavaScript

// Get product ID from URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

// Update header with user info
const user = auth.getCurrentUser();
if (user) {
    document.getElementById('userName').textContent = user.name || 'Sales User';
    document.getElementById('userRole').textContent = user.role || 'sales';
    document.getElementById('sidebarName').textContent = user.name || 'Sales Associate';
    document.getElementById('sidebarRole').textContent = user.role || 'sales';
}

let currentProduct = null;
let quantity = 1;

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&';
        if (m === '<') return '<';
        if (m === '>') return '>';
        return m;
    });
}

function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function changeQuantity(delta) {
    quantity = Math.max(1, Math.min(99, quantity + delta));
    document.getElementById('qtyValue').value = quantity;
}

async function addToCart() {
    if (!currentProduct) return;
    
    try {
        // Get cart from localStorage
        let cart = JSON.parse(localStorage.getItem('sales_cart') || '[]');
        
        const existingItem = cart.find(item => item.id === currentProduct.id);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                id: currentProduct.id,
                name: currentProduct.name,
                sku: currentProduct.sku,
                price: parseFloat(currentProduct.price),
                quantity: quantity,
                brand: currentProduct.brand || ''
            });
        }
        
        localStorage.setItem('sales_cart', JSON.stringify(cart));
        showToast(`${currentProduct.name} added to cart!`, 'success');
        
        // Redirect back to dashboard after short delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
    } catch (error) {
        console.error('Failed to add to cart:', error);
        showToast('Failed to add to cart', 'error');
    }
}

async function loadProduct() {
    if (!productId) {
        document.getElementById('productContent').innerHTML = '<div class="error-state">Product ID not provided</div>';
        return;
    }
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/products/${productId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem(CONFIG.TOKEN_KEY)}` }
        });
        const data = await response.json();
        
        if (!data.success) throw new Error(data.error);
        currentProduct = data.data;
        
        // Calculate total stock
        const inventory = currentProduct.inventory || [];
        const totalStock = inventory.reduce((sum, inv) => sum + inv.quantity, 0);
        
        let stockClass = 'stock-out-of-stock';
        let stockText = 'Out of Stock';
        if (totalStock > 10) {
            stockClass = 'stock-in-stock';
            stockText = 'In Stock';
        } else if (totalStock > 0) {
            stockClass = 'stock-low-stock';
            stockText = `Low Stock (${totalStock} left)`;
        }
        
        // Build warehouse HTML
        let warehouseHtml = '';
        if (inventory.length > 0) {
            warehouseHtml = inventory.map(inv => `
                <div class="warehouse-item">
                    <span class="warehouse-name">${escapeHtml(inv.warehouse_name || 'Warehouse ID: ' + inv.warehouse_id)}</span>
                    <span class="warehouse-quantity">${inv.quantity} units</span>
                </div>
            `).join('');
        } else {
            warehouseHtml = '<div class="warehouse-item">No inventory records found</div>';
        }
        
        document.getElementById('productContent').innerHTML = `
            <div class="product-header">
                <div class="product-title">
                    <h1>${escapeHtml(currentProduct.name)}</h1>
                    <div class="product-sku">SKU: ${escapeHtml(currentProduct.sku)}</div>
                </div>
                <div class="product-price-large">
                    <div class="price">$${parseFloat(currentProduct.price).toFixed(2)}</div>
                    <div class="cost">Cost: $${parseFloat(currentProduct.cost).toFixed(2)}</div>
                </div>
            </div>
            
            <div class="product-info">
                <div class="info-grid">
                    <div class="info-card">
                        <label>Brand</label>
                        <div class="value">${escapeHtml(currentProduct.brand || '—')}</div>
                    </div>
                    <div class="info-card">
                        <label>Category</label>
                        <div class="value">${escapeHtml(currentProduct.category_name || '—')}</div>
                    </div>
                    <div class="info-card">
                        <label>Supplier</label>
                        <div class="value">${escapeHtml(currentProduct.supplier_name || '—')}</div>
                    </div>
                    <div class="info-card">
                        <label>Stock Status</label>
                        <div class="value"><span class="stock-status ${stockClass}">${stockText}</span></div>
                    </div>
                </div>
                ${currentProduct.description ? `<p style="color: var(--text-2); line-height: 1.6;">${escapeHtml(currentProduct.description)}</p>` : ''}
            </div>
            
            <div class="inventory-section">
                <h3>📦 Inventory by Warehouse</h3>
                <div class="warehouse-list">
                    ${warehouseHtml}
                </div>
            </div>
            
            <div class="add-to-cart-section">
                <div class="quantity-selector">
                    <label>Quantity:</label>
                    <div class="qty-control">
                        <button class="qty-btn" onclick="changeQuantity(-1)">-</button>
                        <input type="number" id="qtyValue" class="qty-input" value="1" min="1" max="99" onchange="quantity = parseInt(this.value) || 1">
                        <button class="qty-btn" onclick="changeQuantity(1)">+</button>
                    </div>
                </div>
                <button class="btn-add-large" onclick="addToCart()">🛒 Add to Cart</button>
            </div>
        `;
        
        // Set up quantity input listener
        const qtyInput = document.getElementById('qtyValue');
        if (qtyInput) {
            qtyInput.addEventListener('change', function() {
                quantity = Math.max(1, Math.min(99, parseInt(this.value) || 1));
                this.value = quantity;
            });
        }
        
    } catch (error) {
        console.error('Failed to load product:', error);
        document.getElementById('productContent').innerHTML = '<div class="error-state">Failed to load product details. Please try again.</div>';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&';
        if (m === '<') return '<';
        if (m === '>') return '>';
        return m;
    });
}

// Load product on page load
loadProduct();

// Export functions
window.changeQuantity = changeQuantity;
window.addToCart = addToCart;