// frontend/js/admin-suppliers.js


// ============================================
// GLOBAL VARIABLES
// ============================================
let suppliersTable = null;
let currentSupplierId = null;
let allSuppliers = [];

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin Suppliers page loading...');
    
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
    new Sidebar('sidebar', 'suppliers');
    
    // Load suppliers
    await loadSuppliers();
    
    // Setup event listeners
    setupEventListeners();
});

// ============================================
// LOAD SUPPLIERS TABLE
// ============================================
async function loadSuppliers() {
    try {
        console.log('Loading suppliers...');
        
        // Get filter values
        const searchTerm = document.getElementById('filterSearch')?.value || '';
        const activeOnly = document.getElementById('filterActive')?.checked || false;
        
        // Build query string
        let query = '/suppliers?';
        if (activeOnly) query += `is_active=true&`;
        if (searchTerm) query += `search=${encodeURIComponent(searchTerm)}&`;
        
        const response = await apiCall(query);
        allSuppliers = response.data || [];
        
        // Format data for table
        const formattedSuppliers = allSuppliers.map(s => ({
            id: s.id,
            name: s.name,
            contact_person: s.contact_person || '—',
            phone: s.phone || '—',
            email: s.email || '—',
            rating: s.rating ? `${s.rating.toFixed(1)} ★` : '—',
            on_time_rate: s.on_time_delivery_rate ? `${s.on_time_delivery_rate.toFixed(0)}%` : '—',
            status: s.is_active ? 
                '<span class="badge badge-success">Active</span>' : 
                '<span class="badge badge-danger">Inactive</span>'
        }));
        
        // Define table columns
        const columns = [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Supplier Name' },
            { key: 'contact_person', label: 'Contact' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'rating', label: 'Rating' },
            { key: 'on_time_rate', label: 'On-Time %' },
            { key: 'status', label: 'Status' }
        ];
        
        // Create or update table
        if (suppliersTable) {
            suppliersTable.setData(formattedSuppliers);
        } else {
            suppliersTable = new DataTable('suppliersTable', columns, {
                itemsPerPage: 10,
                searchable: false,
                sortable: true,
                onEdit: (id) => openSupplierModal(id),
                onDelete: (id) => deleteSupplier(id),
                onView: (id) => viewSupplierDetails(id)
            });
            suppliersTable.setData(formattedSuppliers);
        }
        
        // Update stats
        updateSupplierStats();
        
        console.log(`Loaded ${allSuppliers.length} suppliers`);
        
    } catch (error) {
        console.error('Failed to load suppliers:', error);
        const tableContainer = document.getElementById('suppliersTable');
        if (tableContainer) {
            tableContainer.innerHTML = '<div class="error-state">Failed to load suppliers. Please refresh.</div>';
        }
    }
}

// ============================================
// UPDATE SUPPLIER STATISTICS
// ============================================
function updateSupplierStats() {
    const statsContainer = document.getElementById('supplierStats');
    if (!statsContainer) return;
    
    const activeSuppliers = allSuppliers.filter(s => s.is_active).length;
    const avgRating = allSuppliers.length > 0 
        ? (allSuppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / allSuppliers.length).toFixed(1)
        : 0;
    const highPerforming = allSuppliers.filter(s => (s.on_time_delivery_rate || 0) >= 90).length;
    
    statsContainer.innerHTML = `
        <div class="stat-chip">Total: ${allSuppliers.length}</div>
        <div class="stat-chip">Active: ${activeSuppliers}</div>
        <div class="stat-chip">Avg Rating: ${avgRating} ★</div>
        <div class="stat-chip">High Performers: ${highPerforming}</div>
    `;
}

// ============================================
// VIEW SUPPLIER DETAILS (with performance)
// ============================================
async function viewSupplierDetails(supplierId) {
    try {
        const response = await apiCall(`/suppliers/${supplierId}`);
        const supplier = response.data;
        
        // Get products from this supplier
        const productsRes = await apiCall(`/products?supplier_id=${supplierId}`);
        const products = productsRes.data || [];
        
        // Calculate performance grade
        let performanceGrade = 'N/A';
        let performanceColor = '';
        const onTimeRate = supplier.on_time_delivery_rate || 0;
        
        if (onTimeRate >= 95) {
            performanceGrade = 'Excellent';
            performanceColor = 'var(--success)';
        } else if (onTimeRate >= 85) {
            performanceGrade = 'Good';
            performanceColor = 'var(--accent-primary)';
        } else if (onTimeRate >= 70) {
            performanceGrade = 'Average';
            performanceColor = 'var(--warning)';
        } else {
            performanceGrade = 'Poor';
            performanceColor = 'var(--danger)';
        }
        
        const modalHtml = `
            <div class="modal-content" style="max-width: 650px;">
                <div class="modal-header">
                    <h2>Supplier Details: ${escapeHtml(supplier.name)}</h2>
                    <button class="close-btn" onclick="closeViewModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="supplier-details">
                        <div class="details-section">
                            <h4>Contact Information</h4>
                            <div class="details-grid">
                                <div><strong>Contact Person:</strong> ${escapeHtml(supplier.contact_person || '—')}</div>
                                <div><strong>Phone:</strong> ${escapeHtml(supplier.phone || '—')}</div>
                                <div><strong>Email:</strong> ${escapeHtml(supplier.email || '—')}</div>
                                <div><strong>Address:</strong> ${escapeHtml(supplier.address || '—')}</div>
                                <div><strong>Tax ID:</strong> ${escapeHtml(supplier.tax_id || '—')}</div>
                                <div><strong>Payment Terms:</strong> ${escapeHtml(supplier.payment_terms || '—')}</div>
                            </div>
                        </div>
                        
                        <div class="details-section">
                            <h4>Performance Metrics</h4>
                            <div class="details-grid">
                                <div><strong>Rating:</strong> ${supplier.rating ? supplier.rating.toFixed(1) + ' ★' : '—'}</div>
                                <div><strong>On-Time Delivery:</strong> ${onTimeRate.toFixed(0)}%</div>
                                <div><strong>Total Orders:</strong> ${supplier.total_orders || 0}</div>
                                <div><strong>Lead Time:</strong> ${supplier.lead_time_days || 7} days</div>
                                <div><strong>Min Order:</strong> ${supplier.minimum_order || 0} units</div>
                                <div><strong style="color: ${performanceColor}">Performance:</strong> ${performanceGrade}</div>
                            </div>
                        </div>
                        
                        <div class="details-section">
                            <h4>Products Supplied (${products.length})</h4>
                            ${products.length > 0 ? 
                                `<div class="product-list">
                                    ${products.slice(0, 10).map(p => 
                                        `<div class="product-chip">${escapeHtml(p.name)}</div>`
                                    ).join('')}
                                    ${products.length > 10 ? `<div class="product-chip">+${products.length - 10} more</div>` : ''}
                                </div>` : 
                                '<p class="help-text">No products currently linked to this supplier</p>'
                            }
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="closeViewModal()">Close</button>
                    <button class="btn btn-primary" onclick="closeViewModal(); openSupplierModal(${supplier.id})">Edit Supplier</button>
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
        console.error('Failed to load supplier details:', error);
        alert('Failed to load supplier details');
    }
}

// ============================================
// OPEN SUPPLIER MODAL (Add/Edit)
// ============================================
async function openSupplierModal(supplierId = null) {
    currentSupplierId = supplierId;
    const modal = document.getElementById('supplierModal');
    const isEdit = supplierId !== null;
    
    // Reset form
    document.getElementById('supplierForm').reset();
    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Supplier' : 'Add Supplier';
    document.getElementById('supplierId').value = '';
    
    if (isEdit) {
        try {
            const response = await apiCall(`/suppliers/${supplierId}`);
            const supplier = response.data;
            
            document.getElementById('supplierId').value = supplier.id;
            document.getElementById('supplierName').value = supplier.name;
            document.getElementById('supplierContact').value = supplier.contact_person || '';
            document.getElementById('supplierPhone').value = supplier.phone || '';
            document.getElementById('supplierEmail').value = supplier.email || '';
            document.getElementById('supplierAddress').value = supplier.address || '';
            document.getElementById('supplierTaxId').value = supplier.tax_id || '';
            document.getElementById('supplierPaymentTerms').value = supplier.payment_terms || '';
            document.getElementById('supplierLeadTime').value = supplier.lead_time_days || 7;
            document.getElementById('supplierMinOrder').value = supplier.minimum_order || 0;
            document.getElementById('supplierActive').checked = supplier.is_active;
            
        } catch (error) {
            console.error('Failed to load supplier:', error);
            alert('Failed to load supplier data');
            return;
        }
    }
    
    modal.style.display = 'flex';
}

// ============================================
// CLOSE SUPPLIER MODAL
// ============================================
function closeSupplierModal() {
    document.getElementById('supplierModal').style.display = 'none';
    currentSupplierId = null;
}

// ============================================
// SAVE SUPPLIER (Create or Update)
// ============================================
async function saveSupplier() {
    const supplierId = document.getElementById('supplierId').value;
    const isEdit = supplierId !== '';
    
    // Validate required fields
    const name = document.getElementById('supplierName').value.trim();
    if (!name) {
        alert('Supplier name is required');
        return;
    }
    
    const supplierData = {
        name: name,
        contact_person: document.getElementById('supplierContact').value.trim() || null,
        phone: document.getElementById('supplierPhone').value.trim() || null,
        email: document.getElementById('supplierEmail').value.trim() || null,
        address: document.getElementById('supplierAddress').value.trim() || null,
        tax_id: document.getElementById('supplierTaxId').value.trim() || null,
        payment_terms: document.getElementById('supplierPaymentTerms').value.trim() || null,
        lead_time_days: parseInt(document.getElementById('supplierLeadTime').value) || 7,
        minimum_order: parseInt(document.getElementById('supplierMinOrder').value) || 0,
        is_active: document.getElementById('supplierActive').checked
    };
    
    // Validate email format if provided
    if (supplierData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(supplierData.email)) {
            alert('Please enter a valid email address');
            return;
        }
    }
    
    // Validate lead time
    if (supplierData.lead_time_days < 0 || supplierData.lead_time_days > 365) {
        alert('Lead time must be between 0 and 365 days');
        return;
    }
    
    try {
        let response;
        if (isEdit) {
            response = await apiCall(`/suppliers/${supplierId}`, {
                method: 'PUT',
                body: JSON.stringify(supplierData)
            });
            showToast('Supplier updated successfully', 'success');
        } else {
            response = await apiCall('/suppliers', {
                method: 'POST',
                body: JSON.stringify(supplierData)
            });
            showToast('Supplier created successfully', 'success');
        }
        
        closeSupplierModal();
        await loadSuppliers();
        
    } catch (error) {
        console.error('Failed to save supplier:', error);
        alert(error.message || 'Failed to save supplier');
    }
}

// ============================================
// DELETE SUPPLIER
// ============================================
async function deleteSupplier(supplierId) {
    // Get supplier name for confirmation
    const supplier = allSuppliers.find(s => s.id === supplierId);
    const supplierName = supplier ? supplier.name : 'this supplier';
    
    // Check if supplier has products
    try {
        const productsRes = await apiCall(`/products?supplier_id=${supplierId}`);
        const productCount = productsRes.data?.length || 0;
        
        if (productCount > 0) {
            alert(`Cannot delete "${supplierName}" because it has ${productCount} product(s) linked to it. Please reassign products first.`);
            return;
        }
    } catch (error) {
        console.error('Failed to check supplier products:', error);
    }
    
    if (!confirm(`Are you sure you want to delete supplier "${supplierName}"?`)) {
        return;
    }
    
    try {
        await apiCall(`/suppliers/${supplierId}`, { method: 'DELETE' });
        showToast('Supplier deleted successfully', 'success');
        await loadSuppliers();
        
    } catch (error) {
        console.error('Failed to delete supplier:', error);
        alert(error.message || 'Failed to delete supplier');
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
// RESET FILTERS
// ============================================
function resetFilters() {
    const searchInput = document.getElementById('filterSearch');
    const activeCheckbox = document.getElementById('filterActive');
    
    if (searchInput) searchInput.value = '';
    if (activeCheckbox) activeCheckbox.checked = false;
    
    loadSuppliers();
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    const applyFilterBtn = document.getElementById('applyFilter');
    const resetFilterBtn = document.getElementById('resetFilter');
    const searchInput = document.getElementById('filterSearch');
    
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', loadSuppliers);
    }
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', resetFilters);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadSuppliers();
        });
    }
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
window.openSupplierModal = openSupplierModal;
window.closeSupplierModal = closeSupplierModal;
window.saveSupplier = saveSupplier;
window.deleteSupplier = deleteSupplier;
window.viewSupplierDetails = viewSupplierDetails;
window.closeViewModal = closeViewModal;
window.resetFilters = resetFilters;

console.log('✅ Admin Suppliers module loaded');
