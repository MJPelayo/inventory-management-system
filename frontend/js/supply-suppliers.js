// frontend/js/supply-suppliers.js
/**
 * Supply Supplier Management Module
 * Handles supplier CRUD and performance tracking
 * 
 * @module supply-suppliers
 */

// ============================================
// GLOBAL VARIABLES
// ============================================
let allSuppliers = [];
let currentSupplier = null;
let currentPage = 1;
let itemsPerPage = 10;
let currentFilters = {
    search: '',
    performance: ''
};

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Supply Suppliers page loading...');
    
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
    new Sidebar('sidebar', 'suppliers');
    
    await loadSuppliers();
    await loadSupplierStats();
    
    setupEventListeners();
});

// ============================================
// LOAD SUPPLIER STATS
// ============================================
async function loadSupplierStats() {
    try {
        const response = await apiCall('/suppliers');
        const suppliers = response.data || [];
        
        const total = suppliers.length;
        const active = suppliers.filter(s => s.is_active).length;
        const avgRating = suppliers.length > 0 
            ? (suppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / suppliers.length).toFixed(1)
            : 0;
        const avgOnTime = suppliers.length > 0
            ? (suppliers.reduce((sum, s) => sum + (s.on_time_delivery_rate || 0), 0) / suppliers.length).toFixed(0)
            : 0;
        
        document.getElementById('totalSuppliers').textContent = total;
        document.getElementById('activeSuppliers').textContent = active;
        document.getElementById('avgRating').textContent = `${avgRating} ★`;
        document.getElementById('avgOnTime').textContent = `${avgOnTime}%`;
        
    } catch (error) {
        console.error('Failed to load supplier stats:', error);
    }
}

// ============================================
// LOAD SUPPLIERS
// ============================================
async function loadSuppliers() {
    const container = document.getElementById('suppliersTable');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading">Loading suppliers...</div>';
        
        let query = '/suppliers?';
        if (currentFilters.search) query += `search=${encodeURIComponent(currentFilters.search)}&`;
        
        const response = await apiCall(query);
        let suppliers = response.data || [];
        
        // Apply performance filter client-side
        if (currentFilters.performance) {
            suppliers = suppliers.filter(s => {
                const rate = s.on_time_delivery_rate || 0;
                if (currentFilters.performance === 'excellent') return rate >= 95;
                if (currentFilters.performance === 'good') return rate >= 85 && rate < 95;
                if (currentFilters.performance === 'average') return rate >= 70 && rate < 85;
                if (currentFilters.performance === 'poor') return rate < 70;
                return true;
            });
        }
        
        allSuppliers = suppliers.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        
        document.getElementById('supplierCount').textContent = `${allSuppliers.length} suppliers`;
        
        if (allSuppliers.length === 0) {
            container.innerHTML = '<div class="empty-state">No suppliers found. Add your first supplier!</div>';
            return;
        }
        
        displaySuppliers();
        
    } catch (error) {
        console.error('Failed to load suppliers:', error);
        container.innerHTML = '<div class="error-state">Failed to load suppliers</div>';
    }
}

// ============================================
// DISPLAY SUPPLIERS WITH PAGINATION
// ============================================
function displaySuppliers() {
    const container = document.getElementById('suppliersTable');
    const start = (currentPage - 1) * itemsPerPage;
    const pageSuppliers = allSuppliers.slice(start, start + itemsPerPage);
    const totalPages = Math.ceil(allSuppliers.length / itemsPerPage);
    
    const tableHtml = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Supplier</th>
                    <th>Contact</th>
                    <th>Rating</th>
                    <th>On-Time %</th>
                    <th>Lead Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${pageSuppliers.map(supplier => {
                    const ratingStars = getRatingStars(supplier.rating || 0);
                    const onTimeRate = supplier.on_time_delivery_rate || 0;
                    let performanceClass = '';
                    if (onTimeRate >= 90) performanceClass = 'badge-success';
                    else if (onTimeRate >= 75) performanceClass = 'badge-warning';
                    else performanceClass = 'badge-danger';
                    
                    return `
                        <tr>
                            <td><strong>${escapeHtml(supplier.name)}</strong><br><small>${escapeHtml(supplier.email || '—')}</small></td>
                            <td>${escapeHtml(supplier.contact_person || '—')}<br><small>${escapeHtml(supplier.phone || '—')}</small></td>
                            <td class="rating-cell">${ratingStars}</td>
                            <td><span class="badge ${performanceClass}">${onTimeRate.toFixed(0)}%</span></td>
                            <td>${supplier.lead_time_days || 7} days</td>
                            <td>${supplier.is_active ? '<span class="badge-success">Active</span>' : '<span class="badge-danger">Inactive</span>'}</td>
                            <td>
                                <button class="btn-icon" onclick="viewSupplierDetail(${supplier.id})" title="View Details">👁️</button>
                                <button class="btn-icon" onclick="editSupplier(${supplier.id})" title="Edit">✏️</button>
                             </td>
                         </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        ${renderPagination(currentPage, totalPages)}
    `;
    
    container.innerHTML = tableHtml;
}

function getRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '★';
    if (halfStar) stars += '½';
    for (let i = stars.length; i < 5; i++) stars += '☆';
    return `<span class="rating-stars">${stars}</span>`;
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
    displaySuppliers();
}

// ============================================
// VIEW SUPPLIER DETAILS
// ============================================
async function viewSupplierDetail(supplierId) {
    try {
        const response = await apiCall(`/suppliers/${supplierId}`);
        const supplier = response.data;
        currentSupplier = supplier;
        
        // Get products from this supplier
        const productsRes = await apiCall(`/products?supplier_id=${supplierId}`);
        const products = productsRes.data || [];
        
        const onTimeRate = supplier.on_time_delivery_rate || 0;
        let performanceText = '';
        if (onTimeRate >= 95) performanceText = 'Excellent';
        else if (onTimeRate >= 85) performanceText = 'Good';
        else if (onTimeRate >= 70) performanceText = 'Average';
        else performanceText = 'Needs Improvement';
        
        document.getElementById('supplierDetailName').textContent = supplier.name;
        
        const modalContent = document.getElementById('supplierDetailContent');
        modalContent.innerHTML = `
            <div class="supplier-detail-grid">
                <div class="detail-card">
                    <h4>Contact Information</h4>
                    <p><strong>Contact Person:</strong> ${escapeHtml(supplier.contact_person || '—')}</p>
                    <p><strong>Phone:</strong> ${escapeHtml(supplier.phone || '—')}</p>
                    <p><strong>Email:</strong> ${escapeHtml(supplier.email || '—')}</p>
                    <p><strong>Address:</strong> ${escapeHtml(supplier.address || '—')}</p>
                </div>
                <div class="detail-card">
                    <h4>Business Information</h4>
                    <p><strong>Tax ID:</strong> ${escapeHtml(supplier.tax_id || '—')}</p>
                    <p><strong>Payment Terms:</strong> ${escapeHtml(supplier.payment_terms || '—')}</p>
                    <p><strong>Lead Time:</strong> ${supplier.lead_time_days || 7} days</p>
                    <p><strong>Min Order:</strong> ${supplier.minimum_order || 0} units</p>
                </div>
                <div class="detail-card">
                    <h4>Performance Metrics</h4>
                    <p><strong>Rating:</strong> ${getRatingStars(supplier.rating || 0)}</p>
                    <p><strong>On-Time Delivery:</strong> ${onTimeRate.toFixed(0)}%</p>
                    <p><strong>Total Orders:</strong> ${supplier.total_orders || 0}</p>
                    <p><strong>Performance:</strong> <span class="badge ${onTimeRate >= 90 ? 'badge-success' : 'badge-warning'}">${performanceText}</span></p>
                </div>
                <div class="detail-card">
                    <h4>Products Supplied (${products.length})</h4>
                    <div class="product-list">
                        ${products.slice(0, 10).map(p => 
                            `<span class="product-tag">${escapeHtml(p.name)}</span>`
                        ).join('')}
                        ${products.length > 10 ? `<span class="product-tag">+${products.length - 10} more</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('supplierDetailModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Failed to load supplier details:', error);
        showToast('Failed to load supplier details', 'error');
    }
}

// ============================================
// EDIT SUPPLIER (redirect to admin panel or inline edit)
// ============================================
function editSupplier(supplierId) {
    // Since full supplier management is in admin panel
    window.location.href = `/pages/admin/suppliers.html?edit=${supplierId}`;
}

function editFromDetail() {
    if (currentSupplier) {
        editSupplier(currentSupplier.id);
    }
}

function closeSupplierDetailModal() {
    document.getElementById('supplierDetailModal').style.display = 'none';
    currentSupplier = null;
}

// ============================================
// OPEN ADD SUPPLIER MODAL
// ============================================
function openSupplierModal() {
    window.location.href = '/pages/admin/suppliers.html';
}

// ============================================
// FILTER FUNCTIONS
// ============================================
function applyFilters() {
    currentFilters = {
        search: document.getElementById('searchInput')?.value || '',
        performance: document.getElementById('performanceFilter')?.value || ''
    };
    currentPage = 1;
    loadSuppliers();
}

function resetFilters() {
    const searchInput = document.getElementById('searchInput');
    const performanceFilter = document.getElementById('performanceFilter');
    
    if (searchInput) searchInput.value = '';
    if (performanceFilter) performanceFilter.value = '';
    
    currentFilters = { search: '', performance: '' };
    currentPage = 1;
    loadSuppliers();
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
window.viewSupplierDetail = viewSupplierDetail;
window.closeSupplierDetailModal = closeSupplierDetailModal;
window.editFromDetail = editFromDetail;
window.openSupplierModal = openSupplierModal;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.goToPage = goToPage;

console.log('✅ Supply Suppliers module loaded');