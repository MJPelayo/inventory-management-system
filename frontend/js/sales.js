// frontend/js/sales.js


// ============================================
// GLOBAL VARIABLES
// ============================================
let cart = [];
let allProducts = [];
let categories = [];
let currentPage = 1;
let itemsPerPage = 12;
let currentFilters = {
    search: '',
    category_id: '',
    min_price: '',
    max_price: ''
};

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Sales Panel loading...');
    
    // Check authentication and role
    if (!auth.isLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }
    
    if (!auth.hasRole(['sales', 'admin'])) {
        alert('Access denied. Sales privileges required.');
        auth.logout();
        return;
    }
    
    // Initialize header and sidebar
    new Header('appHeader');
    new Sidebar('sidebar', 'dashboard');
    
    // Initialize chat system with delay to ensure ChatSystem class is loaded
    setTimeout(() => {
        if (typeof ChatSystem !== 'undefined' && !window.chatSystem) {
            window.chatSystem = new ChatSystem();
            console.log('✅ Chat system initialized for Sales');
        }
    }, 1000);
    
    // Load cart from localStorage
    loadCartFromStorage();
    updateCartCount();
    
    // Load delivery types from database
    await dropdownLoader.loadAll();
    await dropdownLoader.populateSelect('deliveryType', 'delivery_types', 'type_code', 'type_name');
    
    // Load initial data
    await loadCategories();
    await loadProducts();
    
    // Setup event listeners
    setupEventListeners();
    
    // Display user greeting
    displayUserGreeting();
});

// ============================================
// DISPLAY USER GREETING
// ============================================
function displayUserGreeting() {
    const user = auth.getCurrentUser();
    const greetingElement = document.getElementById('userGreeting');
    if (greetingElement && user) {
        const hour = new Date().getHours();
        let greeting = 'Good ';
        if (hour < 12) greeting += 'Morning';
        else if (hour < 18) greeting += 'Afternoon';
        else greeting += 'Evening';
        
        greetingElement.textContent = `${greeting}, ${user.name || 'Sales Associate'}!`;
    }
}

// ============================================
// LOAD CATEGORIES FOR FILTER
// ============================================
async function loadCategories() {
    try {
        const response = await apiCall('/categories/tree');
        categories = response.data || [];
        populateCategoryFilters(categories);
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

// ============================================
// POPULATE CATEGORY FILTERS
// ============================================
function populateCategoryFilters(cats, prefix = '', container = null) {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;
    
    const buildOptions = (categories, prefix = '', level = 0) => {
        let html = '';
        for (const cat of categories) {
            const indent = '  '.repeat(level);
            const displayName = level > 0 ? `${indent}└ ${cat.name}` : cat.name;
            html += `<option value="${cat.id}">${escapeHtml(displayName)}</option>`;
            if (cat.children && cat.children.length > 0) {
                html += buildOptions(cat.children, prefix, level + 1);
            }
        }
        return html;
    };
    
    categoryFilter.innerHTML = '<option value="">📁 All Categories</option>' + buildOptions(cats);
}

// ============================================
// LOAD PRODUCTS WITH FILTERS
// ============================================
async function loadProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (productsGrid) {
        productsGrid.innerHTML = '<div class="loading-state">Loading products...</div>';
    }
    
    try {
        // Build query string
        let query = '/products?is_active=true';
        if (currentFilters.search) {
            query += `&search=${encodeURIComponent(currentFilters.search)}`;
        }
        if (currentFilters.category_id) {
            query += `&category_id=${currentFilters.category_id}`;
        }
        
        const response = await apiCall(query);
        let products = response.data || [];
        
        // Apply price filters client-side
        if (currentFilters.min_price) {
            products = products.filter(p => p.price >= parseFloat(currentFilters.min_price));
        }
        if (currentFilters.max_price) {
            products = products.filter(p => p.price <= parseFloat(currentFilters.max_price));
        }
        
        allProducts = products;
        displayProducts();
        
    } catch (error) {
        console.error('Failed to load products:', error);
        if (productsGrid) {
            productsGrid.innerHTML = '<div class="error-state">Failed to load products. Please refresh.</div>';
        }
    }
}

// ============================================
// DISPLAY PRODUCTS IN GRID
// ============================================
function displayProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageProducts = allProducts.slice(start, end);
    const totalPages = Math.ceil(allProducts.length / itemsPerPage);
    
    if (pageProducts.length === 0) {
        productsGrid.innerHTML = '<div class="empty-state">No products found. Try adjusting your filters.</div>';
        updatePagination(0, 0);
        return;
    }
    
    productsGrid.innerHTML = pageProducts.map(product => `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-card-header">
                <h3 class="product-name">${escapeHtml(product.name)}</h3>
                <span class="product-sku">${escapeHtml(product.sku)}</span>
            </div>
            <div class="product-card-body">
                ${product.brand ? `<div class="product-brand">${escapeHtml(product.brand)}</div>` : ''}
                <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
                <div class="product-stock" id="stock-${product.id}">
                    <span class="stock-status">Checking stock...</span>
                </div>
            </div>
            <div class="product-card-footer">
                <div class="quantity-control">
                    <button class="qty-btn" onclick="changeQuantity(${product.id}, -1)">-</button>
                    <input type="number" id="qty-${product.id}" class="qty-input" value="1" min="1" max="999">
                    <button class="qty-btn" onclick="changeQuantity(${product.id}, 1)">+</button>
                </div>
                <button class="btn-add-to-cart" onclick="addToCart(${product.id})">
                    🛒 Add to Cart
                </button>
            </div>
        </div>
    `).join('');
    
    // Load stock information for each product
    loadProductStockInfo(pageProducts);
    
    // Update pagination
    updatePagination(currentPage, totalPages);
}

// ============================================
// LOAD PRODUCT STOCK INFORMATION
// ============================================
async function loadProductStockInfo(products) {
    for (const product of products) {
        try {
            const response = await apiCall(`/products/${product.id}`);
            const productData = response.data;
            const totalStock = productData.inventory?.reduce((sum, inv) => sum + inv.quantity, 0) || 0;
            
            const stockElement = document.getElementById(`stock-${product.id}`);
            if (stockElement) {
                if (totalStock === 0) {
                    stockElement.innerHTML = '<span class="stock-status out-of-stock">Out of Stock</span>';
                } else if (totalStock < 10) {
                    stockElement.innerHTML = `<span class="stock-status low-stock">Low Stock: ${totalStock} left</span>`;
                } else {
                    stockElement.innerHTML = `<span class="stock-status in-stock">In Stock: ${totalStock} units</span>`;
                }
            }
        } catch (error) {
            console.error(`Failed to load stock for product ${product.id}:`, error);
        }
    }
}

// ============================================
// CHANGE QUANTITY IN PRODUCT CARD
// ============================================
function changeQuantity(productId, delta) {
    const input = document.getElementById(`qty-${productId}`);
    if (input) {
        let newValue = parseInt(input.value) + delta;
        newValue = Math.max(1, Math.min(999, newValue));
        input.value = newValue;
    }
}

// ============================================
// ADD PRODUCT TO CART
// ============================================
async function addToCart(productId) {
    const quantityInput = document.getElementById(`qty-${productId}`);
    const quantity = parseInt(quantityInput?.value || 1);
    
    try {
        // Get product details
        const response = await apiCall(`/products/${productId}`);
        const product = response.data;
        
        // Check if product is already in cart
        const existingItem = cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                sku: product.sku,
                price: parseFloat(product.price),
                quantity: quantity,
                brand: product.brand || ''
            });
        }
        
        saveCartToStorage();
        updateCartCount();
        showToast(`${product.name} added to cart!`, 'success');
        
        // Reset quantity input to 1
        if (quantityInput) quantityInput.value = 1;
        
    } catch (error) {
        console.error('Failed to add to cart:', error);
        showToast('Failed to add item to cart', 'error');
    }
}

// ============================================
// CART MANAGEMENT FUNCTIONS
// ============================================
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('sales_cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (e) {
            cart = [];
        }
    }
    updateCartSidebar();
}

function saveCartToStorage() {
    localStorage.setItem('sales_cart', JSON.stringify(cart));
    updateCartSidebar();
}

function updateCartCount() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
    updateCartSidebar();
}

function updateCartSidebar() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
        if (cartTotal) cartTotal.textContent = '$0.00';
        return;
    }
    
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item" data-product-id="${item.id}">
            <div class="cart-item-info">
                <div class="cart-item-name">${escapeHtml(item.name)}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
            </div>
            <div class="cart-item-controls">
                <button class="cart-qty-btn" onclick="updateCartItemQuantity(${item.id}, -1)">-</button>
                <span class="cart-item-qty">${item.quantity}</span>
                <button class="cart-qty-btn" onclick="updateCartItemQuantity(${item.id}, 1)">+</button>
                <button class="cart-remove-btn" onclick="removeFromCart(${item.id})">🗑️</button>
            </div>
            <div class="cart-item-total">$${(item.price * item.quantity).toFixed(2)}</div>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (cartTotal) cartTotal.textContent = `$${total.toFixed(2)}`;
}

function updateCartItemQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else if (newQuantity <= 999) {
            item.quantity = newQuantity;
            saveCartToStorage();
            updateCartCount();
        }
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCartToStorage();
    updateCartCount();
}

// ============================================
// CLEAR CART
// ============================================
function clearCart() {
    if (confirm('Are you sure you want to clear your entire cart?')) {
        cart = [];
        saveCartToStorage();
        updateCartCount();
        showToast('Cart cleared', 'info');
    }
}

// ============================================
// OPEN CHECKOUT MODAL
// ============================================
function openCheckoutModal() {
    if (cart.length === 0) {
        showToast('Your cart is empty. Add some products first.', 'error');
        return;
    }
    
    const modal = document.getElementById('checkoutModal');
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    document.getElementById('checkoutSubtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('checkoutTotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('discountAmount').value = '0';
    document.getElementById('discountReason').value = '';
    
    // Reset form
    document.getElementById('customerName').value = '';
    document.getElementById('customerEmail').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('shippingAddress').value = '';
    document.getElementById('deliveryType').value = 'pickup';
    
    modal.style.display = 'flex';
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').style.display = 'none';
}

// ============================================
// UPDATE DISCOUNT IN CHECKOUT
// ============================================
function updateDiscount() {
    const discountPercent = parseFloat(document.getElementById('discountAmount').value) || 0;
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountAmount = subtotal * (discountPercent / 100);
    const total = subtotal - discountAmount;
    
    document.getElementById('discountDisplay').textContent = `-$${discountAmount.toFixed(2)}`;
    document.getElementById('checkoutTotal').textContent = `$${total.toFixed(2)}`;
}

// ============================================
// SUBMIT ORDER
// ============================================
async function submitOrder() {
    const customerName = document.getElementById('customerName').value.trim();
    const customerEmail = document.getElementById('customerEmail').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const shippingAddress = document.getElementById('shippingAddress').value.trim();
    const deliveryType = document.getElementById('deliveryType').value;
    const discountPercent = parseFloat(document.getElementById('discountAmount').value) || 0;
    const discountReason = document.getElementById('discountReason').value.trim();
    
    if (!customerName) {
        showToast('Customer name is required', 'error');
        return;
    }
    
    if (deliveryType === 'delivery' && !shippingAddress) {
        showToast('Shipping address is required for delivery', 'error');
        return;
    }
    
    const orderItems = cart.map(item => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price
    }));
    
    const orderData = {
        customer_name: customerName,
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        shipping_address: shippingAddress || null,
        delivery_type: deliveryType,
        items: orderItems,
        discount_amount: discountPercent
    };
    
    try {
        // First check if discount needs approval
        if (discountPercent > 10) {
            // Request discount approval first
            const tempOrder = await apiCall('/orders/sales', {
                method: 'POST',
                body: JSON.stringify(orderData)
            });
            
            // Request approval
            await apiCall(`/orders/sales/${tempOrder.data.id}/discount-request`, {
                method: 'POST',
                body: JSON.stringify({
                    requested_discount: discountPercent,
                    reason: discountReason || 'Customer discount request'
                })
            });
            
            showToast('Order created with discount pending approval. Admin will review.', 'info');
        } else {
            // Create order directly
            await apiCall('/orders/sales', {
                method: 'POST',
                body: JSON.stringify(orderData)
            });
            showToast('Order placed successfully!', 'success');
        }
        
        // Clear cart and close modal
        cart = [];
        saveCartToStorage();
        updateCartCount();
        closeCheckoutModal();
        
        // Redirect to orders page
        setTimeout(() => {
            window.location.href = '/pages/sales/orders.html';
        }, 1500);
        
    } catch (error) {
        console.error('Failed to create order:', error);
        showToast(error.message || 'Failed to create order', 'error');
    }
}

// ============================================
// FILTER FUNCTIONS
// ============================================
function applyFilters() {
    const categoryId = document.getElementById('categoryFilter')?.value || '';
    
    currentFilters = {
        search: document.getElementById('searchInput')?.value || '',
        category_id: categoryId,  // This will work with backend subcategory logic
        min_price: document.getElementById('minPrice')?.value || '',
        max_price: document.getElementById('maxPrice')?.value || ''
    };
    currentPage = 1;
    loadProducts();
}

function resetFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const minPrice = document.getElementById('minPrice');
    const maxPrice = document.getElementById('maxPrice');
    
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (minPrice) minPrice.value = '';
    if (maxPrice) maxPrice.value = '';
    
    currentFilters = { search: '', category_id: '', min_price: '', max_price: '' };
    currentPage = 1;
    loadProducts();
}

// ============================================
// PAGINATION
// ============================================
function goToPage(page) {
    const totalPages = Math.ceil(allProducts.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        displayProducts();
    }
}

function updatePagination(current, total) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    if (total <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    for (let i = 1; i <= total; i++) {
        html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    pagination.innerHTML = html;
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const applyFiltersBtn = document.getElementById('applyFilters');
    const resetFiltersBtn = document.getElementById('resetFilters');
    const discountAmount = document.getElementById('discountAmount');
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') applyFilters();
        });
    }
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
    if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetFilters);
    if (discountAmount) discountAmount.addEventListener('input', updateDiscount);
}

// ============================================
// TOGGLE CART SIDEBAR (for mobile)
// ============================================
function toggleCartSidebar() {
    const cartSidebar = document.getElementById('cartSidebar');
    if (cartSidebar) {
        cartSidebar.classList.toggle('open');
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
window.addToCart = addToCart;
window.changeQuantity = changeQuantity;
window.updateCartItemQuantity = updateCartItemQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.openCheckoutModal = openCheckoutModal;
window.closeCheckoutModal = closeCheckoutModal;
window.submitOrder = submitOrder;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.goToPage = goToPage;
window.toggleCartSidebar = toggleCartSidebar;
window.updateDiscount = updateDiscount;

console.log('✅ Sales module loaded');