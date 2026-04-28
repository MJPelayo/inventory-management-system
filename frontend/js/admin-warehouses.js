// frontend/js/admin-warehouses.js


// ============================================
// GLOBAL VARIABLES
// ============================================
let warehousesTable = null;
let currentWarehouseId = null;
let allWarehouses = [];

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin Warehouses page loading...');
    
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
    new Sidebar('sidebar', 'warehouses');
    
    // Load warehouses
    await loadWarehouses();
    
    // Setup event listeners
    setupEventListeners();
});

// ============================================
// LOAD WAREHOUSES TABLE
// ============================================
async function loadWarehouses() {
    try {
        console.log('Loading warehouses...');
        
        // Get filter values
        const searchTerm = document.getElementById('filterSearch')?.value || '';
        const activeOnly = document.getElementById('filterActive')?.checked || false;
        
        // Build query string (API currently doesn't support filters, we'll filter client-side)
        const response = await apiCall('/warehouses');
        let warehouses = response.data || [];
        
        // Client-side filtering
        if (activeOnly) {
            warehouses = warehouses.filter(w => w.is_active);
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            warehouses = warehouses.filter(w => 
                w.name.toLowerCase().includes(term) || 
                (w.location && w.location.toLowerCase().includes(term))
            );
        }
        
        allWarehouses = warehouses;
        
        // Format data for table
        const formattedWarehouses = warehouses.map(w => {
            let utilizationClass = '';
            let utilizationStatus = '';
            const utilization = w.utilization || 0;
            
            if (utilization >= 90) {
                utilizationClass = 'badge-danger';
                utilizationStatus = 'Critical';
            } else if (utilization >= 75) {
                utilizationClass = 'badge-warning';
                utilizationStatus = 'High';
            } else if (utilization >= 50) {
                utilizationClass = 'badge-info';
                utilizationStatus = 'Moderate';
            } else {
                utilizationClass = 'badge-success';
                utilizationStatus = 'Good';
            }
            
            return {
                id: w.id,
                name: w.name,
                location: w.location || '—',
                capacity: w.capacity ? w.capacity.toLocaleString() : '—',
                occupancy: w.current_occupancy ? w.current_occupancy.toLocaleString() : '0',
                utilization: `${utilization.toFixed(1)}%`,
                status: w.is_active ? 
                    '<span class="badge badge-success">Active</span>' : 
                    '<span class="badge badge-danger">Inactive</span>',
                utilization_badge: `<span class="badge ${utilizationClass}">${utilizationStatus}</span>`
            };
        });
        
        // Define table columns
        const columns = [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Warehouse Name' },
            { key: 'location', label: 'Location' },
            { key: 'capacity', label: 'Capacity' },
            { key: 'occupancy', label: 'Occupancy' },
            { key: 'utilization', label: 'Utilization' },
            { key: 'utilization_badge', label: 'Status' },
            { key: 'status', label: 'Active' }
        ];
        
        // Create or update table
        if (warehousesTable) {
            warehousesTable.setData(formattedWarehouses);
        } else {
            warehousesTable = new DataTable('warehousesTable', columns, {
                itemsPerPage: 10,
                searchable: false,
                sortable: true,
                onEdit: (id) => openWarehouseModal(id),
                onDelete: (id) => deleteWarehouse(id),
                onView: (id) => viewWarehouseDetails(id)
            });
            warehousesTable.setData(formattedWarehouses);
        }
        
        // Update stats
        updateWarehouseStats();
        
        console.log(`Loaded ${warehouses.length} warehouses`);
        
    } catch (error) {
        console.error('Failed to load warehouses:', error);
        const tableContainer = document.getElementById('warehousesTable');
        if (tableContainer) {
            tableContainer.innerHTML = '<div class="error-state">Failed to load warehouses. Please refresh.</div>';
        }
    }
}

// ============================================
// UPDATE WAREHOUSE STATISTICS
// ============================================
function updateWarehouseStats() {
    const statsContainer = document.getElementById('warehouseStats');
    if (!statsContainer) return;
    
    const activeWarehouses = allWarehouses.filter(w => w.is_active).length;
    const totalCapacity = allWarehouses.reduce((sum, w) => sum + (w.capacity || 0), 0);
    const totalOccupancy = allWarehouses.reduce((sum, w) => sum + (w.current_occupancy || 0), 0);
    const overallUtilization = totalCapacity > 0 ? (totalOccupancy / totalCapacity) * 100 : 0;
    
    // Count warehouses needing attention (utilization > 85%)
    const criticalWarehouses = allWarehouses.filter(w => (w.utilization || 0) >= 85).length;
    
    statsContainer.innerHTML = `
        <div class="stat-chip">Total: ${allWarehouses.length}</div>
        <div class="stat-chip">Active: ${activeWarehouses}</div>
        <div class="stat-chip">Overall Utilization: ${overallUtilization.toFixed(1)}%</div>
        <div class="stat-chip ${criticalWarehouses > 0 ? 'warning' : ''}">
            ${criticalWarehouses > 0 ? `⚠️ ${criticalWarehouses} at capacity` : '✅ All good'}
        </div>
    `;
}

// ============================================
// VIEW WAREHOUSE DETAILS (with inventory)
// ============================================
async function viewWarehouseDetails(warehouseId) {
    try {
        const response = await apiCall(`/warehouses/${warehouseId}`);
        const warehouse = response.data;
        
        // Get inventory for this warehouse
        const inventoryRes = await apiCall(`/inventory/warehouse/${warehouseId}`);
        const inventory = inventoryRes.data || [];
        
        // Calculate metrics
        const uniqueProducts = inventory.length;
        const totalValue = inventory.reduce((sum, item) => {
            return sum + (item.quantity * (item.price || 0));
        }, 0);
        
        const utilization = warehouse.utilization || 0;
        let utilizationColor = '';
        let utilizationMessage = '';
        
        if (utilization >= 90) {
            utilizationColor = 'var(--danger)';
            utilizationMessage = '⚠️ Critical - Near capacity! Consider expanding or transferring stock.';
        } else if (utilization >= 75) {
            utilizationColor = 'var(--warning)';
            utilizationMessage = '⚠️ High utilization - Monitor closely.';
        } else if (utilization >= 50) {
            utilizationColor = 'var(--accent-primary)';
            utilizationMessage = '✓ Moderate utilization - Good.';
        } else {
            utilizationColor = 'var(--success)';
            utilizationMessage = '✓ Low utilization - Available space.';
        }
        
        // Build inventory table HTML
        let inventoryHtml = '';
        if (inventory.length > 0) {
            inventoryHtml = `
                <table class="inventory-table">
                    <thead>
                        <tr><th>Product</th><th>SKU</th><th>Quantity</th><th>Value</th></tr>
                    </thead>
                    <tbody>
                        ${inventory.slice(0, 20).map(item => `
                            <tr>
                                <td>${escapeHtml(item.product_name || 'Product ID: ' + item.product_id)}</td>
                                <td>${escapeHtml(item.sku || '—')}</td>
                                <td>${item.quantity}</td>
                                <td>$${(item.quantity * (item.price || 0)).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        ${inventory.length > 20 ? `<tr><td colspan="4" class="help-text">+${inventory.length - 20} more products</td></tr>` : ''}
                    </tbody>
                </table>
            `;
        } else {
            inventoryHtml = '<p class="help-text">No inventory records found in this warehouse.</p>';
        }
        
        const modalHtml = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>Warehouse Details: ${escapeHtml(warehouse.name)}</h2>
                    <button class="close-btn" onclick="closeViewModal()">&times;</button>
                </div>
                <div class="modal-body" style="max-height: 600px; overflow-y: auto;">
                    <div class="details-section">
                        <h4>Warehouse Information</h4>
                        <div class="details-grid">
                            <div><strong>Name:</strong> ${escapeHtml(warehouse.name)}</div>
                            <div><strong>Location:</strong> ${escapeHtml(warehouse.location || '—')}</div>
                            <div><strong>Capacity:</strong> ${(warehouse.capacity || 0).toLocaleString()} units</div>
                            <div><strong>Current Occupancy:</strong> ${(warehouse.current_occupancy || 0).toLocaleString()} units</div>
                            <div><strong>Utilization:</strong> <span style="color: ${utilizationColor}; font-weight: bold;">${utilization.toFixed(1)}%</span></div>
                            <div><strong>Status:</strong> ${warehouse.is_active ? 'Active' : 'Inactive'}</div>
                        </div>
                        <div class="utilization-message" style="margin-top: 12px; padding: 8px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
                            ${utilizationMessage}
                        </div>
                    </div>
                    
                    <div class="details-section">
                        <h4>Inventory Summary</h4>
                        <div class="details-grid" style="margin-bottom: 16px;">
                            <div><strong>Unique Products:</strong> ${uniqueProducts}</div>
                            <div><strong>Total Inventory Value:</strong> $${totalValue.toFixed(2)}</div>
                        </div>
                        
                        <h5>Product List</h5>
                        ${inventoryHtml}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="closeViewModal()">Close</button>
                    <button class="btn btn-primary" onclick="closeViewModal(); openWarehouseModal(${warehouse.id})">Edit Warehouse</button>
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
        console.error('Failed to load warehouse details:', error);
        alert('Failed to load warehouse details');
    }
}

// ============================================
// OPEN WAREHOUSE MODAL (Add/Edit)
// ============================================
async function openWarehouseModal(warehouseId = null) {
    currentWarehouseId = warehouseId;
    const modal = document.getElementById('warehouseModal');
    const isEdit = warehouseId !== null;
    
    // Reset form
    document.getElementById('warehouseForm').reset();
    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Warehouse' : 'Add Warehouse';
    document.getElementById('warehouseId').value = '';
    
    if (isEdit) {
        try {
            const response = await apiCall(`/warehouses/${warehouseId}`);
            const warehouse = response.data;
            
            document.getElementById('warehouseId').value = warehouse.id;
            document.getElementById('warehouseName').value = warehouse.name;
            document.getElementById('warehouseLocation').value = warehouse.location || '';
            document.getElementById('warehouseCapacity').value = warehouse.capacity || '';
            document.getElementById('warehouseActive').checked = warehouse.is_active;
            
            // Show capacity note for edit mode
            const capacityNote = document.getElementById('capacityNote');
            if (capacityNote && warehouse.capacity) {
                const utilization = warehouse.utilization || 0;
                capacityNote.innerHTML = `Current utilization: ${utilization.toFixed(1)}% (${(warehouse.current_occupancy || 0).toLocaleString()} / ${warehouse.capacity.toLocaleString()} units)`;
                capacityNote.style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to load warehouse:', error);
            alert('Failed to load warehouse data');
            return;
        }
    } else {
        const capacityNote = document.getElementById('capacityNote');
        if (capacityNote) capacityNote.style.display = 'none';
    }
    
    modal.style.display = 'flex';
}

// ============================================
// CLOSE WAREHOUSE MODAL
// ============================================
function closeWarehouseModal() {
    document.getElementById('warehouseModal').style.display = 'none';
    currentWarehouseId = null;
}

// ============================================
// SAVE WAREHOUSE (Create or Update)
// ============================================
async function saveWarehouse() {
    const warehouseId = document.getElementById('warehouseId').value;
    const isEdit = warehouseId !== '';
    
    // Validate required fields
    const name = document.getElementById('warehouseName').value.trim();
    if (!name) {
        alert('Warehouse name is required');
        return;
    }
    
    const capacity = parseInt(document.getElementById('warehouseCapacity').value);
    if (isNaN(capacity) || capacity < 0) {
        alert('Please enter a valid capacity (must be 0 or greater)');
        return;
    }
    
    const warehouseData = {
        name: name,
        location: document.getElementById('warehouseLocation').value.trim() || null,
        capacity: capacity,
        is_active: document.getElementById('warehouseActive').checked
    };
    
    try {
        let response;
        if (isEdit) {
            response = await apiCall(`/warehouses/${warehouseId}`, {
                method: 'PUT',
                body: JSON.stringify(warehouseData)
            });
            showToast('Warehouse updated successfully', 'success');
        } else {
            response = await apiCall('/warehouses', {
                method: 'POST',
                body: JSON.stringify(warehouseData)
            });
            showToast('Warehouse created successfully', 'success');
        }
        
        closeWarehouseModal();
        await loadWarehouses();
        
    } catch (error) {
        console.error('Failed to save warehouse:', error);
        alert(error.message || 'Failed to save warehouse');
    }
}

// ============================================
// DELETE WAREHOUSE
// ============================================
async function deleteWarehouse(warehouseId) {
    // Get warehouse name for confirmation
    const warehouse = allWarehouses.find(w => w.id === warehouseId);
    const warehouseName = warehouse ? warehouse.name : 'this warehouse';
    
    // Check if warehouse has inventory
    try {
        const inventoryRes = await apiCall(`/inventory/warehouse/${warehouseId}`);
        const inventoryCount = inventoryRes.data?.length || 0;
        
        if (inventoryCount > 0) {
            alert(`Cannot delete "${warehouseName}" because it has ${inventoryCount} inventory record(s). Please transfer or remove inventory first.`);
            return;
        }
    } catch (error) {
        console.error('Failed to check warehouse inventory:', error);
    }
    
    if (!confirm(`Are you sure you want to delete warehouse "${warehouseName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        await apiCall(`/warehouses/${warehouseId}`, { method: 'DELETE' });
        showToast('Warehouse deleted successfully', 'success');
        await loadWarehouses();
        
    } catch (error) {
        console.error('Failed to delete warehouse:', error);
        alert(error.message || 'Failed to delete warehouse');
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
    
    loadWarehouses();
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    const applyFilterBtn = document.getElementById('applyFilter');
    const resetFilterBtn = document.getElementById('resetFilter');
    const searchInput = document.getElementById('filterSearch');
    
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', loadWarehouses);
    }
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', resetFilters);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadWarehouses();
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
window.openWarehouseModal = openWarehouseModal;
window.closeWarehouseModal = closeWarehouseModal;
window.saveWarehouse = saveWarehouse;
window.deleteWarehouse = deleteWarehouse;
window.viewWarehouseDetails = viewWarehouseDetails;
window.closeViewModal = closeViewModal;
window.resetFilters = resetFilters;

console.log('✅ Admin Warehouses module loaded');