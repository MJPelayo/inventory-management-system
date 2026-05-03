// frontend/js/supply-suppliers.js
/**
 * Supply Supplier Management Module
 * Handles supplier CRUD and performance tracking
 * 
 * @module supply-suppliers
 */

// ============================================
// SUPPLIER PERMISSIONS CHECK
// ============================================
function checkSupplierPermissions(supplierId = null) {
    const user = auth.getCurrentUser();
    const isSupply = user.role === 'supply';
    const isAdmin = user.role === 'admin';
    
    return {
        canAdd: isSupply || isAdmin,
        canEdit: isSupply || isAdmin,
        canDelete: isAdmin, // Only admin can delete
        canRequestDelete: isSupply // Supply can request deletion
    };
}

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
        
        document.getElementById('totalSuppliers').textContent = total;
        document.getElementById('activeSuppliers').textContent = active;
        
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
        
        allSuppliers = suppliers;
        
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
                    <th>Lead Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${pageSuppliers.map(supplier => {
                    const permissions = checkSupplierPermissions(supplier.id);
                    
                    const actionButtons = `
                        <button class="btn-icon" onclick="viewSupplierDetail(${supplier.id})" title="View Details">👁️</button>
                        ${permissions.canEdit ? `<button class="btn-icon" onclick="editSupplier(${supplier.id})" title="Edit">✏️</button>` : ''}
                        ${permissions.canDelete ?
                            `<button class="btn-icon btn-danger" onclick="deleteSupplier(${supplier.id})" title="Delete">🗑️</button>` :
                            (permissions.canRequestDelete ?
                                `<button class="btn-icon" onclick="requestDeleteSupplier(${supplier.id}, '${escapeHtml(supplier.name)}')" title="Request Deletion">📨</button>` : '')
                        }
                    `;
                    
                    return `
                        <tr>
                            <td><strong>${escapeHtml(supplier.name)}</strong><br><small>${escapeHtml(supplier.email || '—')}</small></td>
                            <td>${escapeHtml(supplier.contact_person || '—')}<br><small>${escapeHtml(supplier.phone || '—')}</small></td>
                            <td>${supplier.lead_time_days || 7} days</td>
                            <td>${supplier.is_active ? '<span class="badge-success">Active</span>' : '<span class="badge-danger">Inactive</span>'}</td>
                            <td>${actionButtons}</td>
                          </tr>
                    `;
                }).join('')}
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
// REQUEST DELETE SUPPLIER (for supply role)
// ============================================
async function requestDeleteSupplier(supplierId, supplierName) {
    const reason = prompt(`Why do you want to delete supplier "${supplierName}"?\n\nProvide reason for admin review:`);
    if (!reason) return;
    
    try {
        // Send request to admin via notification system
        const requestData = {
            type: 'DELETE_SUPPLIER',
            entity_type: 'supplier',
            entity_id: supplierId,
            entity_name: supplierName,
            reason: reason,
            requested_by: auth.getCurrentUser().id,
            requested_by_name: auth.getCurrentUser().name,
            status: 'pending'
        };
        
        await apiCall('/api/requests', {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
        
        showToast(`Deletion request sent to admin for "${supplierName}"`, 'success');
        
        // Remove from local list
        allSuppliers = allSuppliers.filter(s => s.id !== supplierId);
        displaySuppliers();
        
    } catch (error) {
        console.error('Failed to send deletion request:', error);
        showToast('Failed to send request. Please try again.', 'error');
    }
}

// ============================================
// DELETE SUPPLIER (admin only - called from permission-checked buttons)
// ============================================
async function deleteSupplier(supplierId) {
    const supplier = allSuppliers.find(s => s.id === supplierId);
    const supplierName = supplier ? supplier.name : 'this supplier';
    
    if (!confirm(`Are you sure you want to delete supplier "${supplierName}"? This action cannot be undone.`)) return;
    
    try {
        await apiCall(`/suppliers/${supplierId}`, { method: 'DELETE' });
        showToast('Supplier deleted successfully', 'success');
        
        // Remove from local list and refresh
        allSuppliers = allSuppliers.filter(s => s.id !== supplierId);
        document.getElementById('supplierCount').textContent = `${allSuppliers.length} suppliers`;
        displaySuppliers();
        await loadSupplierStats();
        
    } catch (error) {
        console.error('Failed to delete supplier:', error);
        showToast('Failed to delete supplier', 'error');
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
    const permissions = checkSupplierPermissions();
    
    if (permissions.canAdd) {
        // Allow supply to add suppliers directly with limited fields
        const modalHtml = `
            <div class="modal-content" style="max-width: 650px;">
                <div class="modal-header">
                    <h2>Add New Supplier</h2>
                    <button class="close-btn" onclick="closeAddSupplierModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="addSupplierFormSupply">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Supplier Name *</label>
                                <input type="text" id="supplySupplierName" required>
                            </div>
                            <div class="form-group">
                                <label>Contact Person</label>
                                <input type="text" id="supplyContactPerson">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Phone</label>
                                <input type="tel" id="supplyPhone">
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" id="supplyEmail">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Address</label>
                            <textarea id="supplyAddress" rows="2"></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Payment Terms</label>
                                <input type="text" id="supplyPaymentTerms" placeholder="e.g., Net 30">
                            </div>
                            <div class="form-group">
                                <label>Lead Time (days)</label>
                                <input type="number" id="supplyLeadTime" value="7">
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="closeAddSupplierModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveNewSupplier()">Save Supplier</button>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.id = 'addSupplierModalSupply';
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);
    } else {
        window.location.href = '/pages/admin/suppliers.html';
    }
}

async function saveNewSupplier() {
    const supplierData = {
        name: document.getElementById('supplySupplierName').value.trim(),
        contact_person: document.getElementById('supplyContactPerson').value.trim() || null,
        phone: document.getElementById('supplyPhone').value.trim() || null,
        email: document.getElementById('supplyEmail').value.trim() || null,
        address: document.getElementById('supplyAddress').value.trim() || null,
        payment_terms: document.getElementById('supplyPaymentTerms').value.trim() || null,
        lead_time_days: parseInt(document.getElementById('supplyLeadTime').value) || 7,
        is_active: true
    };
    
    if (!supplierData.name) {
        showToast('Supplier name is required', 'error');
        return;
    }
    
    try {
        const response = await apiCall('/suppliers', {
            method: 'POST',
            body: JSON.stringify(supplierData)
        });
        
        if (response.success) {
            showToast('Supplier added successfully', 'success');
            closeAddSupplierModal();
            await loadSuppliers();
            await loadSupplierStats();
        }
    } catch (error) {
        showToast(error.message || 'Failed to add supplier', 'error');
    }
}

function closeAddSupplierModal() {
    const modal = document.getElementById('addSupplierModalSupply');
    if (modal) modal.remove();
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
window.checkSupplierPermissions = checkSupplierPermissions;
window.viewSupplierDetail = viewSupplierDetail;
window.closeSupplierDetailModal = closeSupplierDetailModal;
window.editFromDetail = editFromDetail;
window.editSupplier = editSupplier;
window.openSupplierModal = openSupplierModal;
window.saveNewSupplier = saveNewSupplier;
window.closeAddSupplierModal = closeAddSupplierModal;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.goToPage = goToPage;
window.requestDeleteSupplier = requestDeleteSupplier;
window.deleteSupplier = deleteSupplier;

console.log('✅ Supply Suppliers module loaded');