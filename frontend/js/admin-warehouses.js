// frontend/js/admin-warehouses.js

// ============================================
// GLOBAL VARIABLES
// ============================================
let warehousesTable = null;
let currentWarehouseId = null;
let allWarehouses = [];
let detailPanelOpen = false;

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin Warehouses page loading...');
    
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
    new Sidebar('sidebar', 'warehouses');
    
    await loadWarehouses();
    setupEventListeners();
    
    // Close side panel on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDetailPanel();
    });
});

// ============================================
// HELPER FUNCTIONS
// ============================================
function safeNumber(value) {
    if (value === null || value === undefined) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

function getOccupancyPercentage(warehouse) {
    const capacity = safeNumber(warehouse.capacity);
    if (capacity === 0) return 0;
    const occupancy = safeNumber(warehouse.current_occupancy);
    return Math.min(Math.round((occupancy / capacity) * 100), 100);
}

function getOccupancyClass(pct) {
    if (pct >= 90) return 'occ-critical';
    if (pct >= 75) return 'occ-warning';
    if (pct >= 50) return 'occ-moderate';
    return 'occ-good';
}

function getOccupancyText(pct) {
    if (pct >= 90) return 'Critical';
    if (pct >= 75) return 'High';
    if (pct >= 50) return 'Moderate';
    return 'Good';
}

// ============================================
// LOAD WAREHOUSES
// ============================================
async function loadWarehouses() {
    try {
        console.log('Loading warehouses...');
        
        const searchTerm = document.getElementById('filterSearch')?.value || '';
        const activeOnly = document.getElementById('filterActive')?.checked || false;
        
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
        
        // Fetch inventory counts for each warehouse
        for (const warehouse of allWarehouses) {
            try {
                const inventoryRes = await apiCall(`/inventory/warehouse/${warehouse.id}`);
                const inventory = inventoryRes.data || [];
                warehouse.product_count = inventory.length;
                warehouse.total_units = inventory.reduce((sum, item) => sum + safeNumber(item.quantity), 0);
            } catch (e) {
                warehouse.product_count = 0;
                warehouse.total_units = 0;
            }
        }
        
        // Format data for table
        const formattedWarehouses = allWarehouses.map(w => {
            const pct = getOccupancyPercentage(w);
            const occClass = getOccupancyClass(pct);
            const occText = getOccupancyText(pct);
            
            return {
                id: w.id,
                name: `<div class="warehouse-name">${escapeHtml(w.name)}</div>`,
                location: escapeHtml(w.location || '—'),
                capacity: safeNumber(w.capacity).toLocaleString(),
                occupancy: safeNumber(w.current_occupancy).toLocaleString(),
                utilization: pct,
                utilization_display: `
                    <div class="utilization-container">
                        <div class="utilization-bar">
                            <div class="utilization-fill ${occClass}" style="width: ${pct}%"></div>
                        </div>
                        <span class="utilization-text ${occClass}-text">${pct}% (${occText})</span>
                    </div>
                `,
                products: w.product_count || 0,
                stock_units: (w.total_units || 0).toLocaleString(),
                status: w.is_active ? 
                    '<span class="badge badge-success">Active</span>' : 
                    '<span class="badge badge-danger">Inactive</span>'
            };
        });
        
        const columns = [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Warehouse Name' },
            { key: 'location', label: 'Location' },
            { key: 'capacity', label: 'Capacity' },
            { key: 'occupancy', label: 'Occupancy' },
            { key: 'utilization_display', label: 'Utilization' },
            { key: 'products', label: 'Products' },
            { key: 'stock_units', label: 'Stock Units' },
            { key: 'status', label: 'Status' }
        ];
        
        if (warehousesTable) {
            warehousesTable.setData(formattedWarehouses);
        } else {
            warehousesTable = new DataTable('warehousesTable', columns, {
                itemsPerPage: 8,
                searchable: false,
                sortable: true,
                onEdit: (id) => openWarehouseModal(id),
                onDelete: (id) => deleteWarehouse(id),
                onView: (id) => openDetailPanel(id)
            });
            warehousesTable.setData(formattedWarehouses);
        }
        
        updateWarehouseStats();
        
        console.log(`Loaded ${allWarehouses.length} warehouses`);
        
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
    const totalCapacity = allWarehouses.reduce((sum, w) => sum + safeNumber(w.capacity), 0);
    const totalOccupancy = allWarehouses.reduce((sum, w) => sum + safeNumber(w.current_occupancy), 0);
    const overallUtilization = totalCapacity > 0 ? (totalOccupancy / totalCapacity) * 100 : 0;
    const criticalWarehouses = allWarehouses.filter(w => getOccupancyPercentage(w) >= 90).length;
    
    statsContainer.innerHTML = `
        <div class="stat-chip">Total: ${allWarehouses.length}</div>
        <div class="stat-chip">Active: ${activeWarehouses}</div>
        <div class="stat-chip">Total Capacity: ${totalCapacity.toLocaleString()}</div>
        <div class="stat-chip">Overall: ${overallUtilization.toFixed(0)}%</div>
        ${criticalWarehouses > 0 ? `<div class="stat-chip warning">⚠️ ${criticalWarehouses} at capacity</div>` : '<div class="stat-chip">✅ All good</div>'}
    `;
}

// ============================================
// OPEN DETAIL PANEL (Side Panel from Version B)
// ============================================
async function openDetailPanel(warehouseId) {
    const warehouse = allWarehouses.find(w => w.id === warehouseId);
    if (!warehouse) return;
    
    currentWarehouseId = warehouseId;
    const panel = document.getElementById('detailPanel');
    const titleEl = document.getElementById('detailTitle');
    const locationEl = document.getElementById('detailLocation');
    const bodyEl = document.getElementById('detailBody');
    
    if (titleEl) titleEl.textContent = warehouse.name;
    if (locationEl) locationEl.textContent = warehouse.location || 'No location set';
    if (bodyEl) bodyEl.innerHTML = '<div class="loading-state">Loading inventory...</div>';
    
    if (panel) panel.classList.add('open');
    detailPanelOpen = true;
    
    try {
        // Get detailed warehouse info with inventory
        const response = await apiCall(`/warehouses/${warehouseId}`);
        const warehouseDetail = response.data;
        
        // Get inventory for this warehouse
        const inventoryRes = await apiCall(`/inventory/warehouse/${warehouseId}`);
        const inventory = inventoryRes.data || [];
        
        renderDetailPanel(warehouseDetail, inventory);
        
    } catch (error) {
        console.error('Failed to load warehouse details:', error);
        if (bodyEl) {
            bodyEl.innerHTML = '<div class="error-state">Failed to load inventory data</div>';
        }
    }
}

function renderDetailPanel(warehouse, inventory) {
    const bodyEl = document.getElementById('detailBody');
    if (!bodyEl) return;
    
    const pct = getOccupancyPercentage(warehouse);
    const occClass = getOccupancyClass(pct);
    const occText = getOccupancyText(pct);
    const totalValue = inventory.reduce((sum, item) => sum + (safeNumber(item.quantity) * safeNumber(item.price)), 0);
    
    let inventoryHtml = '';
    if (inventory.length === 0) {
        inventoryHtml = '<div class="empty-state">No inventory in this warehouse</div>';
    } else {
        inventoryHtml = `
            <table class="detail-inventory-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Category</th>
                        <th>Quantity</th>
                        <th>Reorder At</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${inventory.map(item => {
                        const isLow = safeNumber(item.quantity) <= safeNumber(item.reorder_point);
                        return `
                            <tr>
                                <td>
                                    <div class="product-name">${escapeHtml(item.product_name || 'Product ID: ' + item.product_id)}</div>
                                    ${item.brand ? `<div class="product-brand">${escapeHtml(item.brand)}</div>` : ''}
                                </td>
                                <td><span class="mono">${escapeHtml(item.sku || '—')}</span></td>
                                <td>${escapeHtml(item.category_name || '—')}</td>
                                <td class="quantity">${safeNumber(item.quantity).toLocaleString()}</td>
                                <td class="reorder">${safeNumber(item.reorder_point)}</td>
                                <td>${isLow ? '<span class="badge badge-danger">Low Stock</span>' : '<span class="badge badge-success">OK</span>'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }
    
    bodyEl.innerHTML = `
        <div class="detail-summary">
            <div class="summary-stat">
                <div class="stat-label">Capacity</div>
                <div class="stat-value">${safeNumber(warehouse.capacity).toLocaleString()}</div>
                <div class="stat-sub">units</div>
            </div>
            <div class="summary-stat">
                <div class="stat-label">Occupancy</div>
                <div class="stat-value">${safeNumber(warehouse.current_occupancy).toLocaleString()}</div>
                <div class="stat-sub">units</div>
            </div>
            <div class="summary-stat">
                <div class="stat-label">Utilization</div>
                <div class="stat-value ${occClass}-text">${pct}%</div>
                <div class="stat-sub">${occText}</div>
            </div>
            <div class="summary-stat">
                <div class="stat-label">Inventory Value</div>
                <div class="stat-value">$${totalValue.toFixed(2)}</div>
                <div class="stat-sub">estimated</div>
            </div>
        </div>
        
        <div class="utilization-section">
            <div class="utilization-label">
                <span>Space Utilization</span>
                <span class="${occClass}-text">${pct}%</span>
            </div>
            <div class="utilization-bar-large">
                <div class="utilization-fill-large ${occClass}" style="width: ${pct}%"></div>
            </div>
            <div class="utilization-message ${occClass}">
                ${pct >= 90 ? '⚠️ Critical - Near capacity! Consider expanding or transferring stock.' :
                  pct >= 75 ? '⚠️ High utilization - Monitor closely.' :
                  pct >= 50 ? '✓ Moderate utilization - Good.' :
                  '✓ Low utilization - Available space.'}
            </div>
        </div>
        
        <div class="inventory-section">
            <h4>Inventory Items (${inventory.length})</h4>
            <div class="inventory-table-container">
                ${inventoryHtml}
            </div>
        </div>
    `;
}

function closeDetailPanel() {
    const panel = document.getElementById('detailPanel');
    if (panel) panel.classList.remove('open');
    detailPanelOpen = false;
    currentWarehouseId = null;
}

// ============================================
// OPEN WAREHOUSE MODAL (Add/Edit)
// ============================================
async function openWarehouseModal(warehouseId = null) {
    currentWarehouseId = warehouseId;
    const modal = document.getElementById('warehouseModal');
    const isEdit = warehouseId !== null;
    
    document.getElementById('warehouseForm').reset();
    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Warehouse' : 'Add Warehouse';
    document.getElementById('warehouseId').value = '';
    
    const occupancyField = document.getElementById('occupancyField');
    const statusField = document.getElementById('statusField');
    const capacityNote = document.getElementById('capacityNote');
    
    if (occupancyField) occupancyField.style.display = isEdit ? 'block' : 'none';
    if (statusField) statusField.style.display = isEdit ? 'block' : 'none';
    if (capacityNote) capacityNote.style.display = 'none';
    
    if (isEdit) {
        try {
            const response = await apiCall(`/warehouses/${warehouseId}`);
            const warehouse = response.data;
            
            document.getElementById('warehouseId').value = warehouse.id;
            document.getElementById('warehouseName').value = warehouse.name;
            document.getElementById('warehouseLocation').value = warehouse.location || '';
            document.getElementById('warehouseCapacity').value = warehouse.capacity || '';
            document.getElementById('warehouseOccupancy').value = warehouse.current_occupancy || '';
            document.getElementById('warehouseActive').checked = warehouse.is_active;
            
            if (capacityNote && warehouse.capacity) {
                const pct = getOccupancyPercentage(warehouse);
                capacityNote.innerHTML = `Current utilization: ${pct}% (${safeNumber(warehouse.current_occupancy).toLocaleString()} / ${safeNumber(warehouse.capacity).toLocaleString()} units)`;
                capacityNote.style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to load warehouse:', error);
            alert('Failed to load warehouse data');
            return;
        }
    }
    
    modal.style.display = 'flex';
}

function closeWarehouseModal() {
    document.getElementById('warehouseModal').style.display = 'none';
    currentWarehouseId = null;
}

// ============================================
// SAVE WAREHOUSE
// ============================================
async function saveWarehouse() {
    const warehouseId = document.getElementById('warehouseId').value;
    const isEdit = warehouseId !== '';
    
    const name = document.getElementById('warehouseName').value.trim();
    if (!name) {
        alert('Warehouse name is required');
        return;
    }
    if (name.length < 2) {
        alert('Warehouse name must be at least 2 characters');
        return;
    }
    
    const capacity = parseInt(document.getElementById('warehouseCapacity').value);
    if (isNaN(capacity) || capacity < 0) {
        alert('Please enter a valid capacity (must be 0 or greater)');
        return;
    }
    
    let occupancy = 0;
    if (isEdit) {
        occupancy = parseInt(document.getElementById('warehouseOccupancy').value);
        if (isNaN(occupancy) || occupancy < 0) {
            alert('Please enter a valid occupancy');
            return;
        }
        if (occupancy > capacity) {
            alert('Occupancy cannot exceed capacity');
            return;
        }
    }
    
    const warehouseData = {
        name: name,
        location: document.getElementById('warehouseLocation').value.trim() || null,
        capacity: capacity,
        is_active: document.getElementById('warehouseActive').checked
    };
    
    if (isEdit) {
        warehouseData.current_occupancy = occupancy;
    }
    
    try {
        if (isEdit) {
            await apiCall(`/warehouses/${warehouseId}`, {
                method: 'PUT',
                body: JSON.stringify(warehouseData)
            });
            showToast('Warehouse updated successfully', 'success');
        } else {
            await apiCall('/warehouses', {
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
    
    if (!confirm(`Are you sure you want to delete warehouse "${warehouseName}"? This action cannot be undone.`)) return;
    
    try {
        await apiCall(`/warehouses/${warehouseId}`, { method: 'DELETE' });
        showToast('Warehouse deleted successfully', 'success');
        await loadWarehouses();
    } catch (error) {
        alert(error.message || 'Failed to delete warehouse');
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
    
    loadWarehouses();
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    const applyFilterBtn = document.getElementById('applyFilter');
    const resetFilterBtn = document.getElementById('resetFilter');
    const searchInput = document.getElementById('filterSearch');
    
    if (applyFilterBtn) applyFilterBtn.addEventListener('click', loadWarehouses);
    if (resetFilterBtn) resetFilterBtn.addEventListener('click', resetFilters);
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
window.openWarehouseModal = openWarehouseModal;
window.closeWarehouseModal = closeWarehouseModal;
window.saveWarehouse = saveWarehouse;
window.deleteWarehouse = deleteWarehouse;
window.openDetailPanel = openDetailPanel;
window.closeDetailPanel = closeDetailPanel;
window.resetFilters = resetFilters;

console.log('✅ Admin Warehouses module loaded');