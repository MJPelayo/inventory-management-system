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
    new Sidebar('sidebar', 'suppliers');
    
    // Load dropdowns from database
    await dropdownLoader.loadAll();
    await dropdownLoader.populateSelect('supplierPaymentTerms', 'payment_terms', 'id', 'term_name');
    
    await loadSuppliers();
    setupEventListeners();
});

// ============================================
// HELPER: SAFE NUMBER PARSING
// ============================================
function safeNumber(value, decimals = 1) {
    if (value === null || value === undefined) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}


// ============================================
// LOAD SUPPLIERS
// ============================================
async function loadSuppliers() {
    try {
        console.log('Loading suppliers...');
        
        const searchTerm = document.getElementById('filterSearch')?.value || '';
        const activeOnly = document.getElementById('filterActive')?.checked || false;
        
        let query = '/suppliers?';
        if (activeOnly) query += `is_active=true&`;
        if (searchTerm) query += `search=${encodeURIComponent(searchTerm)}&`;
        
        const response = await apiCall(query);
        allSuppliers = response.data || [];
        
        const formattedSuppliers = allSuppliers.map(s => {
            return {
                id: s.id,
                name: `<strong>${escapeHtml(s.name)}</strong>`,
                contact: escapeHtml(s.contact_person || '—'),
                phone: escapeHtml(s.phone || '—'),
                email: escapeHtml(s.email || '—'),
                payment_terms: getPaymentTermName(s.payment_term_id),
                lead_time: s.lead_time_days ? `${s.lead_time_days} days` : '—',
                status: s.is_active ?
                    '<span class="badge badge-success">Active</span>' :
                    '<span class="badge badge-danger">Inactive</span>'
            };
        });
        
        const columns = [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Supplier Name' },
            { key: 'contact', label: 'Contact Person' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'payment_terms', label: 'Payment Terms' },
            { key: 'lead_time', label: 'Lead Time' },
            { key: 'status', label: 'Status' }
        ];
        
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
    
    statsContainer.innerHTML = `
        <div class="stat-chip">Total: ${allSuppliers.length}</div>
        <div class="stat-chip">Active: ${activeSuppliers}</div>
    `;
}

// ============================================
// VIEW SUPPLIER DETAILS
// ============================================
async function viewSupplierDetails(supplierId) {
    try {
        const response = await apiCall(`/suppliers/${supplierId}`);
        const supplier = response.data;
        
        // Get products from this supplier
        const productsRes = await apiCall(`/products?supplier_id=${supplierId}`);
        const products = productsRes.data || [];
        
        const modalHtml = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>Supplier Details: ${escapeHtml(supplier.name)}</h2>
                    <button class="close-btn" onclick="closeViewModal()">&times;</button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <!-- Contact Information -->
                    <div class="details-section">
                        <h4>📞 Contact Information</h4>
                        <div class="details-grid">
                            <div><strong>Contact Person:</strong> ${escapeHtml(supplier.contact_person || '—')}</div>
                            <div><strong>Phone:</strong> ${escapeHtml(supplier.phone || '—')}</div>
                            <div><strong>Email:</strong> ${escapeHtml(supplier.email || '—')}</div>
                            <div><strong>Address:</strong> ${escapeHtml(supplier.address || '—')}</div>
                            <div><strong>Tax ID:</strong> ${escapeHtml(supplier.tax_id || '—')}</div>
                            <div><strong>Payment Terms:</strong> ${escapeHtml(supplier.payment_terms || '—')}</div>
                        </div>
                    </div>
                    
                    <!-- Business Info -->
                    <div class="details-section">
                        <h4>📋 Business Information</h4>
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-label">Lead Time</div>
                                <div class="metric-value">${supplier.lead_time_days || 7} days</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-label">Min Order</div>
                                <div class="metric-value">${supplier.minimum_order || 0} units</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Products Supplied -->
                    <div class="details-section">
                        <h4>📦 Products Supplied (${products.length})</h4>
                        ${products.length > 0 ?
                            `<div class="product-list">
                                ${products.slice(0, 15).map(p =>
                                    `<div class="product-chip">${escapeHtml(p.name)}</div>`
                                ).join('')}
                                ${products.length > 15 ? `<div class="product-chip">+${products.length - 15} more</div>` : ''}
                            </div>` :
                            '<p class="help-text">No products currently linked to this supplier</p>'
                        }
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="closeViewModal()">Close</button>
                    <button class="btn btn-primary" onclick="closeViewModal(); openSupplierModal(${supplier.id})">Edit Supplier</button>
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
        console.error('Failed to load supplier details:', error);
        alert('Failed to load supplier details');
    }
}

function closeViewModal() {
    const modal = document.getElementById('viewModal');
    if (modal) modal.remove();
}

// ============================================
// OPEN SUPPLIER MODAL (Add/Edit)
// ============================================
async function openSupplierModal(supplierId = null) {
    currentSupplierId = supplierId;
    const modal = document.getElementById('supplierModal');
    const isEdit = supplierId !== null;
    
    document.getElementById('supplierForm').reset();
    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Supplier' : 'Add Supplier';
    document.getElementById('supplierId').value = '';

    // Reset payment terms dropdown to default
    const paymentTermsSelect = document.getElementById('supplierPaymentTerms');
    if (paymentTermsSelect) paymentTermsSelect.value = '';

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
            
            // Set payment terms dropdown
            if (paymentTermsSelect && supplier.payment_term_id) {
                paymentTermsSelect.value = supplier.payment_term_id;
            }
            
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
    
    const name = document.getElementById('supplierName').value.trim();
    if (!name) {
        alert('Supplier name is required');
        return;
    }
    
    const email = document.getElementById('supplierEmail').value.trim();
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return;
        }
    }
    
    const leadTime = parseInt(document.getElementById('supplierLeadTime').value);
    if (isNaN(leadTime) || leadTime < 0 || leadTime > 365) {
        alert('Lead time must be between 0 and 365 days');
        return;
    }
    
    // Get payment terms from dropdown
    const paymentTermsSelect = document.getElementById('supplierPaymentTerms');
    
    const supplierData = {
        name: name,
        contact_person: document.getElementById('supplierContact').value.trim() || null,
        phone: document.getElementById('supplierPhone').value.trim() || null,
        email: email || null,
        address: document.getElementById('supplierAddress').value.trim() || null,
        tax_id: document.getElementById('supplierTaxId').value.trim() || null,
        payment_term_id: paymentTermsSelect ? parseInt(paymentTermsSelect.value) || null : null,
        lead_time_days: leadTime,
        minimum_order: parseInt(document.getElementById('supplierMinOrder').value) || 0,
        is_active: document.getElementById('supplierActive').checked
    };
    
    try {
        if (isEdit) {
            await apiCall(`/suppliers/${supplierId}`, {
                method: 'PUT',
                body: JSON.stringify(supplierData)
            });
            showToast('Supplier updated successfully', 'success');
        } else {
            await apiCall('/suppliers', {
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
    const supplier = allSuppliers.find(s => s.id === supplierId);
    const supplierName = supplier ? supplier.name : 'this supplier';
    
    // Check if supplier has products
    try {
        const productsRes = await apiCall(`/products?supplier_id=${supplierId}`);
        const productCount = productsRes.data?.length || 0;
        
        if (productCount > 0) {
            alert(`Cannot delete "${supplierName}" because it has ${productCount} product(s) linked. Please reassign products first.`);
            return;
        }
    } catch (error) {
        console.error('Failed to check supplier products:', error);
    }
    
    if (!confirm(`Are you sure you want to delete supplier "${supplierName}"?`)) return;
    
    try {
        await apiCall(`/suppliers/${supplierId}`, { method: 'DELETE' });
        showToast('Supplier deleted successfully', 'success');
        await loadSuppliers();
    } catch (error) {
        alert(error.message || 'Failed to delete supplier');
    }
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
    
    if (applyFilterBtn) applyFilterBtn.addEventListener('click', loadSuppliers);
    if (resetFilterBtn) resetFilterBtn.addEventListener('click', resetFilters);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadSuppliers();
        });
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function getPaymentTermName(paymentTermId) {
    if (!paymentTermId) return '—';
    return dropdownLoader.getPaymentTermName(paymentTermId) || '—';
}

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
window.openSupplierModal = openSupplierModal;
window.closeSupplierModal = closeSupplierModal;
window.saveSupplier = saveSupplier;
window.deleteSupplier = deleteSupplier;
window.viewSupplierDetails = viewSupplierDetails;
window.closeViewModal = closeViewModal;
window.resetFilters = resetFilters;

console.log('✅ Admin Suppliers module loaded');