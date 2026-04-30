// Sales Cart Page JavaScript

// Update header with user info
const user = auth.getCurrentUser();
if (user) {
    document.getElementById('userName').textContent = user.name || 'Sales User';
    document.getElementById('userRole').textContent = user.role || 'sales';
    document.getElementById('sidebarName').textContent = user.name || 'Sales Associate';
    document.getElementById('sidebarRole').textContent = user.role || 'sales';
}

let cart = [];
let customers = [];
let currentDiscountPercent = 0;

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

function loadCart() {
    const savedCart = localStorage.getItem('sales_cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (e) {
            cart = [];
        }
    }
    renderCart();
}

function saveCart() {
    localStorage.setItem('sales_cart', JSON.stringify(cart));
    renderCart();
}

function updateCartItemQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) {
            removeCartItem(productId);
        } else if (newQuantity <= 99) {
            item.quantity = newQuantity;
            saveCart();
            showToast(`${item.name} quantity updated`, 'info');
        }
    }
}

function updateCartItemQuantityInput(productId, newQuantity) {
    const quantity = parseInt(newQuantity);
    if (isNaN(quantity) || quantity <= 0) {
        removeCartItem(productId);
    } else if (quantity <= 99) {
        const item = cart.find(i => i.id === productId);
        if (item) {
            item.quantity = quantity;
            saveCart();
        }
    }
}

function removeCartItem(productId) {
    const item = cart.find(i => i.id === productId);
    cart = cart.filter(i => i.id !== productId);
    saveCart();
    if (item) showToast(`${item.name} removed from cart`, 'info');
}

function clearCartItems() {
    if (confirm('Are you sure you want to clear your entire cart?')) {
        cart = [];
        saveCart();
        showToast('Cart cleared', 'info');
    }
}

function renderCart() {
    const container = document.getElementById('cartItemsContainer');
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = subtotal * (currentDiscountPercent / 100);
    const total = subtotal - discount;
    
    document.getElementById('summarySubtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('summaryTotal').textContent = `$${total.toFixed(2)}`;
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <h3>Your cart is empty</h3>
                <p>Add products from the catalog to get started</p>
                <a href="dashboard.html" class="continue-shopping">Browse Products →</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <table class="cart-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${cart.map(item => `
                    <tr>
                        <td>
                            <div class="product-cell">
                                <span class="product-name-cell">${escapeHtml(item.name)}</span>
                                <span class="product-sku-cell">${escapeHtml(item.sku)}</span>
                            </div>
                        </td>
                        <td class="price-cell">$${item.price.toFixed(2)}</td>
                        <td>
                            <div class="quantity-cell">
                                <button class="qty-btn" onclick="updateCartItemQuantity(${item.id}, -1)">-</button>
                                <input type="number" class="qty-input" value="${item.quantity}" min="1" max="99" onchange="updateCartItemQuantityInput(${item.id}, this.value)">
                                <button class="qty-btn" onclick="updateCartItemQuantity(${item.id}, 1)">+</button>
                            </div>
                        </td>
                        <td class="total-cell">$${(item.price * item.quantity).toFixed(2)}</td>
                        <td><button class="remove-btn" onclick="removeCartItem(${item.id})">🗑️</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function proceedToCheckout() {
    if (cart.length === 0) {
        showToast('Your cart is empty. Add some products first.', 'error');
        return;
    }
    
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
    document.getElementById('addressGroup').style.display = 'none';
    
    // Load customers for dropdown
    loadCustomersForSelect();
    
    document.getElementById('checkoutModal').style.display = 'flex';
}

async function loadCustomersForSelect() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/orders/sales`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem(CONFIG.TOKEN_KEY)}` }
        });
        const data = await response.json();
        const orders = data.data || [];
        
        const customerMap = new Map();
        for (const order of orders) {
            if (!customerMap.has(order.customer_name)) {
                customerMap.set(order.customer_name, {
                    name: order.customer_name,
                    email: order.customer_email,
                    phone: order.customer_phone
                });
            }
        }
        customers = Array.from(customerMap.values());
        
        const select = document.getElementById('customerSelect');
        let html = '<option value="">New Customer - Enter below</option>';
        for (const customer of customers) {
            html += `<option value="${escapeHtml(customer.name)}" data-email="${escapeHtml(customer.email || '')}" data-phone="${escapeHtml(customer.phone || '')}">
                ${escapeHtml(customer.name)}
            </option>`;
        }
        select.innerHTML = html;
        
        select.onchange = function() {
            const opt = this.options[this.selectedIndex];
            if (opt.value) {
                document.getElementById('customerName').value = opt.value;
                document.getElementById('customerEmail').value = opt.dataset.email || '';
                document.getElementById('customerPhone').value = opt.dataset.phone || '';
            } else {
                document.getElementById('customerName').value = '';
                document.getElementById('customerEmail').value = '';
                document.getElementById('customerPhone').value = '';
            }
        };
        
    } catch (error) {
        console.error('Failed to load customers:', error);
    }
}

function updateCheckoutDiscount() {
    const discountPercent = parseFloat(document.getElementById('discountAmount').value) || 0;
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountAmount = subtotal * (discountPercent / 100);
    const total = subtotal - discountAmount;
    
    document.getElementById('discountDisplay').textContent = `-$${discountAmount.toFixed(2)}`;
    document.getElementById('checkoutTotal').textContent = `$${total.toFixed(2)}`;
    currentDiscountPercent = discountPercent;
    
    // Update summary card too
    document.getElementById('summaryDiscount').textContent = `-$${discountAmount.toFixed(2)}`;
    document.getElementById('summaryTotal').textContent = `$${total.toFixed(2)}`;
    if (discountPercent > 0) {
        document.getElementById('discountRow').style.display = 'flex';
    } else {
        document.getElementById('discountRow').style.display = 'none';
    }
}

function toggleDeliveryAddress() {
    const deliveryType = document.getElementById('deliveryType');
    const addressGroup = document.getElementById('addressGroup');
    if (deliveryType && addressGroup) {
        addressGroup.style.display = deliveryType.value === 'delivery' ? 'block' : 'none';
    }
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').style.display = 'none';
}

async function submitCartOrder() {
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
        showToast('Creating order...', 'info');
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/orders/sales`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem(CONFIG.TOKEN_KEY)}`
            },
            body: JSON.stringify(orderData)
        });
        
        const data = await response.json();
        
        if (!data.success) throw new Error(data.error);
        
        // If discount needs approval
        if (discountPercent > 10 && discountReason) {
            try {
                await fetch(`${CONFIG.API_BASE_URL}/orders/sales/${data.data.id}/discount-request`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem(CONFIG.TOKEN_KEY)}`
                    },
                    body: JSON.stringify({
                        requested_discount: discountPercent,
                        reason: discountReason
                    })
                });
                showToast(`Order #${data.data.order_number} created with discount pending approval!`, 'success');
            } catch (e) {
                console.log('Discount request endpoint not available');
            }
        } else {
            showToast(`Order #${data.data.order_number} created successfully!`, 'success');
        }
        
        // Clear cart
        cart = [];
        localStorage.setItem('sales_cart', JSON.stringify(cart));
        
        closeCheckoutModal();
        renderCart();
        
        setTimeout(() => {
            window.location.href = 'orders.html';
        }, 1500);
        
    } catch (error) {
        console.error('Failed to create order:', error);
        showToast(error.message || 'Failed to create order', 'error');
    }
}

// Load cart on page load
loadCart();

// Export functions
window.updateCartItemQuantity = updateCartItemQuantity;
window.updateCartItemQuantityInput = updateCartItemQuantityInput;
window.removeCartItem = removeCartItem;
window.clearCartItems = clearCartItems;
window.proceedToCheckout = proceedToCheckout;
window.closeCheckoutModal = closeCheckoutModal;
window.submitCartOrder = submitCartOrder;
window.updateCheckoutDiscount = updateCheckoutDiscount;
window.toggleDeliveryAddress = toggleDeliveryAddress;