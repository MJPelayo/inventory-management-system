// frontend/warehouses.js
const API_BASE = 'http://localhost:3000/api';

// ─── State ────────────────────────────────────────────────────────────────────
let allWarehouses = [];
let editingId = null;
let detailId = null;

// ─── API ──────────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
    return json;
}

async function fetchWarehouses() {
    showLoading(true);
    try {
        const { data } = await apiFetch('/warehouses');
        allWarehouses = data;
        renderAll();
    } catch (err) {
        showError(err.message);
    } finally {
        showLoading(false);
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function occupancyPct(w) {
    if (!w.capacity || w.capacity == 0) return 0;
    return Math.min(Math.round((w.current_occupancy / w.capacity) * 100), 100);
}
function occupancyClass(pct) {
    if (pct >= 90) return 'occ-critical';
    if (pct >= 70) return 'occ-warning';
    return 'occ-good';
}

// ─── Filter ───────────────────────────────────────────────────────────────────
function getFiltered() {
    const search = document.getElementById('search').value.toLowerCase().trim();
    const status = document.getElementById('filterStatus').value;

    return allWarehouses.filter(w => {
        const matchSearch = !search ||
            w.name.toLowerCase().includes(search) ||
            (w.location && w.location.toLowerCase().includes(search));
        const matchStatus = status === 'all' || (status === 'active' ? w.is_active : !w.is_active);
        return matchSearch && matchStatus;
    });
}

// ─── Render Stats ─────────────────────────────────────────────────────────────
function renderStats() {
    const active = allWarehouses.filter(w => w.is_active).length;
    const totalCapacity = allWarehouses.reduce((a, w) => a + Number(w.capacity), 0);
    const totalOccupancy = allWarehouses.reduce((a, w) => a + Number(w.current_occupancy), 0);
    const totalUnits = allWarehouses.reduce((a, w) => a + Number(w.total_units || 0), 0);
    const overallPct = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;

    document.getElementById('stats').innerHTML = `
        <div class="stat">
            <div class="stat-label">Total warehouses</div>
            <div class="stat-value">${allWarehouses.length}</div>
            <div class="stat-sub">${active} active · ${allWarehouses.length - active} inactive</div>
        </div>
        <div class="stat">
            <div class="stat-label">Total capacity</div>
            <div class="stat-value">${totalCapacity.toLocaleString()}</div>
            <div class="stat-sub">units across all locations</div>
        </div>
        <div class="stat">
            <div class="stat-label">Overall occupancy</div>
            <div class="stat-value">${overallPct}%</div>
            <div class="stat-sub">${totalOccupancy.toLocaleString()} of ${totalCapacity.toLocaleString()} units</div>
        </div>
        <div class="stat">
            <div class="stat-label">Total stock units</div>
            <div class="stat-value">${Number(totalUnits).toLocaleString()}</div>
            <div class="stat-sub">across all warehouses</div>
        </div>
    `;
}

// ─── Render Cards ─────────────────────────────────────────────────────────────
function renderCards(filtered) {
    const grid = document.getElementById('cards-grid');

    if (!filtered.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
            <div class="empty-icon">🏭</div>
            <div class="empty-title">No warehouses found</div>
            <div>Try adjusting your search or filters.</div>
        </div>`;
        return;
    }

    grid.innerHTML = filtered.map(w => {
        const pct = occupancyPct(w);
        const cls = occupancyClass(pct);
        return `
        <div class="warehouse-card">
            <div class="card-header">
                <div>
                    <div class="card-name">${escHtml(w.name)}</div>
                    <div class="card-location">${w.location ? escHtml(w.location) : '<span style="color:var(--text-3)">No location set</span>'}</div>
                </div>
                <span class="badge ${w.is_active ? 'badge-active' : 'badge-inactive'}">${w.is_active ? 'Active' : 'Inactive'}</span>
            </div>

            <div class="card-metrics">
                <div class="metric">
                    <div class="metric-val">${Number(w.product_count).toLocaleString()}</div>
                    <div class="metric-label">Products</div>
                </div>
                <div class="metric">
                    <div class="metric-val">${Number(w.total_units || 0).toLocaleString()}</div>
                    <div class="metric-label">Stock units</div>
                </div>
                <div class="metric">
                    <div class="metric-val">${Number(w.capacity).toLocaleString()}</div>
                    <div class="metric-label">Capacity</div>
                </div>
            </div>

            <div class="capacity-section">
                <div class="capacity-label">
                    <span>Occupancy</span>
                    <span class="${cls}-text">${pct}%</span>
                </div>
                <div class="capacity-bar">
                    <div class="capacity-fill ${cls}" style="width:${pct}%"></div>
                </div>
                <div class="capacity-sub">${Number(w.current_occupancy).toLocaleString()} / ${Number(w.capacity).toLocaleString()} units</div>
            </div>

            <div class="card-actions">
                <button class="btn btn-sm" onclick="openDetail(${w.id})">View inventory</button>
                <button class="btn btn-sm" onclick="editWarehouse(${w.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteWarehouse(${w.id}, '${escHtml(w.name)}')">Delete</button>
            </div>
        </div>`;
    }).join('');
}

function renderAll() {
    renderStats();
    renderCards(getFiltered());
}

// ─── Loading / Error ──────────────────────────────────────────────────────────
function showLoading(on) {
    if (on) document.getElementById('cards-grid').innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
            <div class="empty-title" style="color:var(--text-3)">Loading warehouses…</div>
        </div>`;
}
function showError(msg) {
    document.getElementById('cards-grid').innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
            <div class="empty-icon">⚠️</div>
            <div class="empty-title">Failed to load warehouses</div>
            <div style="color:var(--text-3);font-size:13px;margin-top:4px">${escHtml(msg)}</div>
            <button class="btn btn-sm" style="margin-top:12px" onclick="fetchWarehouses()">Retry</button>
        </div>`;
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function openModal(id = null) {
    editingId = id;
    const isEdit = id !== null;
    document.getElementById('modal-title').textContent = isEdit ? 'Edit warehouse' : 'Add warehouse';
    document.getElementById('status-field').style.display = isEdit ? 'flex' : 'none';
    document.getElementById('occupancy-field').style.display = isEdit ? 'flex' : 'none';
    document.getElementById('form-error').style.display = 'none';

    if (isEdit) {
        const w = allWarehouses.find(x => x.id === id);
        document.getElementById('f-name').value        = w.name;
        document.getElementById('f-location').value   = w.location || '';
        document.getElementById('f-capacity').value   = w.capacity;
        document.getElementById('f-occupancy').value  = w.current_occupancy;
        document.getElementById('f-status').value     = String(w.is_active);
    } else {
        ['f-name', 'f-location'].forEach(id => document.getElementById(id).value = '');
        ['f-capacity', 'f-occupancy'].forEach(id => document.getElementById(id).value = '');
    }

    document.getElementById('overlay').classList.add('open');
    setTimeout(() => document.getElementById('f-name').focus(), 50);
}

function editWarehouse(id) { openModal(id); }

function closeModal() {
    document.getElementById('overlay').classList.remove('open');
    editingId = null;
}

function overlayClick(e) {
    if (e.target === document.getElementById('overlay')) closeModal();
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeDetail(); }
});

// ─── Save ─────────────────────────────────────────────────────────────────────
function showFormError(msg) {
    const el = document.getElementById('form-error');
    el.textContent = msg;
    el.style.display = 'block';
}

async function saveWarehouse() {
    const name     = document.getElementById('f-name').value.trim();
    const location = document.getElementById('f-location').value.trim();
    const capacity = parseInt(document.getElementById('f-capacity').value) || 0;
    const occupancy = parseInt(document.getElementById('f-occupancy').value) || 0;

    if (!name || name.length < 2) return showFormError('Name must be at least 2 characters.');
    if (capacity < 0)             return showFormError('Capacity cannot be negative.');
    if (occupancy < 0)            return showFormError('Occupancy cannot be negative.');
    if (occupancy > capacity)     return showFormError('Occupancy cannot exceed capacity.');

    document.getElementById('form-error').style.display = 'none';

    const payload = {
        name,
        location: location || null,
        capacity,
        current_occupancy: occupancy,
    };

    const saveBtn = document.querySelector('.modal-footer .btn-primary');
    saveBtn.textContent = 'Saving…';
    saveBtn.disabled = true;

    try {
        if (editingId !== null) {
            payload.is_active = document.getElementById('f-status').value === 'true';
            const { data } = await apiFetch(`/warehouses/${editingId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            const idx = allWarehouses.findIndex(w => w.id === editingId);
            allWarehouses[idx] = { ...allWarehouses[idx], ...data };
        } else {
            const { data } = await apiFetch('/warehouses', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            allWarehouses.push({ ...data, product_count: 0, total_units: 0 });
        }
        closeModal();
        renderAll();
    } catch (err) {
        showFormError(err.message);
    } finally {
        saveBtn.textContent = 'Save warehouse';
        saveBtn.disabled = false;
    }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteWarehouse(id, name) {
    if (!confirm(`Delete "${name}"?\n\nThis cannot be undone. Warehouses with existing inventory cannot be deleted.`)) return;
    try {
        await apiFetch(`/warehouses/${id}`, { method: 'DELETE' });
        allWarehouses = allWarehouses.filter(w => w.id !== id);
        renderAll();
    } catch (err) {
        alert(`Delete failed: ${err.message}`);
    }
}

// ─── Detail Panel (inventory breakdown) ──────────────────────────────────────
async function openDetail(id) {
    detailId = id;
    const panel = document.getElementById('detail-panel');
    const w = allWarehouses.find(x => x.id === id);

    document.getElementById('detail-title').textContent = w.name;
    document.getElementById('detail-location').textContent = w.location || 'No location set';
    document.getElementById('detail-body').innerHTML = `<div style="color:var(--text-3);font-size:13px;padding:1rem 0">Loading inventory…</div>`;
    panel.classList.add('open');

    try {
        const { data } = await apiFetch(`/warehouses/${id}`);
        renderDetailInventory(data.inventory);
    } catch (err) {
        document.getElementById('detail-body').innerHTML =
            `<div style="color:var(--red);font-size:13px;padding:1rem 0">Failed to load: ${escHtml(err.message)}</div>`;
    }
}

function renderDetailInventory(inventory) {
    const el = document.getElementById('detail-body');
    if (!inventory || !inventory.length) {
        el.innerHTML = `<div style="color:var(--text-3);font-size:13px;padding:1rem 0;text-align:center">No inventory in this warehouse yet.</div>`;
        return;
    }

    el.innerHTML = `
        <table class="detail-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Reorder at</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${inventory.map(item => {
                    const isLow = item.quantity <= item.reorder_point;
                    return `<tr>
                        <td>
                            <div style="font-weight:500">${escHtml(item.product_name)}</div>
                            ${item.brand ? `<div style="font-size:11px;color:var(--text-3)">${escHtml(item.brand)}</div>` : ''}
                        </td>
                        <td><span class="mono">${escHtml(item.sku)}</span></td>
                        <td>${item.category_name ? escHtml(item.category_name) : '<span style="color:var(--text-3)">—</span>'}</td>
                        <td><strong>${item.quantity}</strong></td>
                        <td style="color:var(--text-3)">${item.reorder_point}</td>
                        <td><span class="badge ${isLow ? 'badge-low' : 'badge-ok'}">${isLow ? 'Low stock' : 'OK'}</span></td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
}

function closeDetail() {
    document.getElementById('detail-panel').classList.remove('open');
    detailId = null;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
fetchWarehouses();