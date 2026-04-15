// frontend/products.js
const API_BASE = 'http://localhost:3000/api';

// ─── State ────────────────────────────────────────────────────────────────────
let allProducts = [];
let editingId = null;
let currentPage = 1;
const PER_PAGE = 8;

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

async function fetchProducts() {
    showTableLoading(true);
    try {
        const { data } = await apiFetch('/products');
        allProducts = data;
        renderAll();
    } catch (err) {
        showTableError(err.message);
    } finally {
        showTableLoading(false);
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcMargin(price, cost) {
    if (!price || price === 0) return 0;
    return ((price - cost) / price) * 100;
}
function calcMarkup(price, cost) {
    if (!cost || cost === 0) return 0;
    return ((price - cost) / cost) * 100;
}
function fmt$(n) { return '$' + Number(n).toFixed(2); }
function fmtPct(n) { return Number(n).toFixed(1) + '%'; }
function escHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function marginBadgeClass(m) {
    if (m >= 40) return 'badge-margin-high';
    if (m >= 20) return 'badge-margin-mid';
    return 'badge-margin-low';
}

// ─── Filter & Sort ────────────────────────────────────────────────────────────
function getFiltered() {
    const search = document.getElementById('search').value.toLowerCase().trim();
    const status = document.getElementById('filterStatus').value;
    const sort   = document.getElementById('filterSort').value;

    let list = allProducts.filter(p => {
        const matchSearch = !search ||
            p.name.toLowerCase().includes(search) ||
            p.sku.toLowerCase().includes(search) ||
            (p.brand && p.brand.toLowerCase().includes(search));
        const matchStatus = status === 'all' || (status === 'active' ? p.is_active : !p.is_active);
        return matchSearch && matchStatus;
    });

    list.sort((a, b) => {
        if (sort === 'name')         return a.name.localeCompare(b.name);
        if (sort === 'price-asc')    return a.price - b.price;
        if (sort === 'price-desc')   return b.price - a.price;
        if (sort === 'margin-desc')  return calcMargin(b.price, b.cost) - calcMargin(a.price, a.cost);
        return 0;
    });
    return list;
}

// ─── Render Stats ─────────────────────────────────────────────────────────────
function renderStats() {
    const active = allProducts.filter(p => p.is_active).length;
    const avgMargin = allProducts.length
        ? allProducts.reduce((a, p) => a + calcMargin(p.price, p.cost), 0) / allProducts.length
        : 0;
    const totalValue = allProducts.reduce((a, p) => a + Number(p.price), 0);

    document.getElementById('stats').innerHTML = `
        <div class="stat">
            <div class="stat-label">Total products</div>
            <div class="stat-value">${allProducts.length}</div>
            <div class="stat-sub">${active} active · ${allProducts.length - active} inactive</div>
        </div>
        <div class="stat">
            <div class="stat-label">Active</div>
            <div class="stat-value">${active}</div>
            <div class="stat-sub">${allProducts.length ? Math.round(active / allProducts.length * 100) : 0}% of catalog</div>
        </div>
        <div class="stat">
            <div class="stat-label">Avg margin</div>
            <div class="stat-value">${fmtPct(avgMargin)}</div>
            <div class="stat-sub">across all products</div>
        </div>
        <div class="stat">
            <div class="stat-label">Catalog value</div>
            <div class="stat-value">${fmt$(totalValue)}</div>
            <div class="stat-sub">sum of all prices</div>
        </div>
    `;
}

// ─── Render Table ─────────────────────────────────────────────────────────────
function renderTable(filtered) {
    const start = (currentPage - 1) * PER_PAGE;
    const page = filtered.slice(start, start + PER_PAGE);
    const tbody = document.getElementById('tbody');

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state">
            <div class="empty-icon">📦</div>
            <div class="empty-title">No products found</div>
            <div>Try adjusting your search or filters.</div>
        </div></td></tr>`;
        return;
    }

    tbody.innerHTML = page.map(p => {
        const m = calcMargin(Number(p.price), Number(p.cost));
        return `<tr>
            <td>
                <div class="product-name">${escHtml(p.name)}</div>
                ${p.description ? `<div class="product-desc" title="${escHtml(p.description)}">${escHtml(p.description)}</div>` : ''}
            </td>
            <td><span class="mono">${escHtml(p.sku)}</span></td>
            <td>${p.brand ? escHtml(p.brand) : '<span style="color:var(--text-3)">—</span>'}</td>
            <td>${p.category_name ? escHtml(p.category_name) : '<span style="color:var(--text-3)">—</span>'}</td>
            <td><strong>${fmt$(p.price)}</strong></td>
            <td style="color:var(--text-2)">${fmt$(p.cost)}</td>
            <td><span class="badge ${marginBadgeClass(m)}">${fmtPct(m)}</span></td>
            <td><span class="badge ${p.is_active ? 'badge-active' : 'badge-inactive'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="actions-cell">
                    <button class="btn btn-sm" onclick="editProduct(${p.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id}, '${escHtml(p.name)}')">Delete</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ─── Render Pagination ────────────────────────────────────────────────────────
function renderPagination(filtered) {
    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const pag = document.getElementById('pagination');
    if (totalPages <= 1) { pag.style.display = 'none'; return; }

    pag.style.display = 'flex';
    const start = (currentPage - 1) * PER_PAGE + 1;
    const end = Math.min(currentPage * PER_PAGE, filtered.length);
    let btns = '';
    for (let i = 1; i <= totalPages; i++)
        btns += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;

    pag.innerHTML = `
        <div class="pagination-info">Showing ${start}–${end} of ${filtered.length}</div>
        <div class="pagination-btns">
            <button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&#8592;</button>
            ${btns}
            <button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>&#8594;</button>
        </div>
    `;
}

function goPage(p) { currentPage = p; renderAll(); }

function renderAll() {
    renderStats();
    const filtered = getFiltered();
    if (currentPage > Math.ceil(filtered.length / PER_PAGE)) currentPage = 1;
    renderTable(filtered);
    renderPagination(filtered);
}

// ─── Loading / Error states ───────────────────────────────────────────────────
function showTableLoading(on) {
    const tbody = document.getElementById('tbody');
    if (on) tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state">
        <div class="empty-title" style="color:var(--text-3)">Loading products…</div>
    </div></td></tr>`;
}

function showTableError(msg) {
    document.getElementById('tbody').innerHTML = `<tr><td colspan="9"><div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Failed to load products</div>
        <div style="color:var(--text-3);font-size:13px;margin-top:4px">${escHtml(msg)}</div>
        <button class="btn btn-sm" style="margin-top:12px" onclick="fetchProducts()">Retry</button>
    </div></td></tr>`;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(id = null) {
    editingId = id;
    const isEdit = id !== null;
    document.getElementById('modal-title').textContent = isEdit ? 'Edit product' : 'Add product';
    document.getElementById('status-field').style.display = isEdit ? 'flex' : 'none';
    document.getElementById('form-error').style.display = 'none';
    document.getElementById('margin-preview').style.display = 'none';

    if (isEdit) {
        const p = allProducts.find(x => x.id === id);
        document.getElementById('f-name').value   = p.name;
        document.getElementById('f-sku').value    = p.sku;
        document.getElementById('f-desc').value   = p.description || '';
        document.getElementById('f-brand').value  = p.brand || '';
        document.getElementById('f-price').value  = p.price;
        document.getElementById('f-cost').value   = p.cost;
        document.getElementById('f-img').value    = p.image_url || '';
        document.getElementById('f-cat').value    = p.category_id || '';
        document.getElementById('f-sup').value    = p.supplier_id || '';
        document.getElementById('f-status').value = String(p.is_active);
        updateMarginPreview();
    } else {
        ['f-name','f-sku','f-desc','f-brand','f-img'].forEach(id => document.getElementById(id).value = '');
        ['f-price','f-cost','f-cat','f-sup'].forEach(id => document.getElementById(id).value = '');
    }

    document.getElementById('overlay').classList.add('open');
    setTimeout(() => document.getElementById('f-name').focus(), 50);
}

function editProduct(id) { openModal(id); }

function closeModal() {
    document.getElementById('overlay').classList.remove('open');
    editingId = null;
}

function overlayClick(e) {
    if (e.target === document.getElementById('overlay')) closeModal();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ─── Margin Preview ───────────────────────────────────────────────────────────
function updateMarginPreview() {
    const price = parseFloat(document.getElementById('f-price').value) || 0;
    const cost  = parseFloat(document.getElementById('f-cost').value) || 0;
    const preview = document.getElementById('margin-preview');

    if (price > 0) {
        preview.style.display = 'flex';
        const m = calcMargin(price, cost);
        const cls = m >= 40 ? 'good' : m >= 20 ? 'warn' : 'bad';
        document.getElementById('mp-margin').className = 'mp-val ' + cls;
        document.getElementById('mp-margin').textContent = fmtPct(m);
        document.getElementById('mp-profit').textContent = fmt$(price - cost);
        document.getElementById('mp-markup').textContent = fmtPct(calcMarkup(price, cost));
    } else {
        preview.style.display = 'none';
    }
}

// ─── Save (Create / Update) ───────────────────────────────────────────────────
function showError(msg) {
    const el = document.getElementById('form-error');
    el.textContent = msg;
    el.style.display = 'block';
}

async function saveProduct() {
    const name  = document.getElementById('f-name').value.trim();
    const sku   = document.getElementById('f-sku').value.trim();
    const price = parseFloat(document.getElementById('f-price').value);
    const cost  = parseFloat(document.getElementById('f-cost').value);

    // Client-side validation (mirrors backend)
    if (!name || name.length < 2)         return showError('Name must be at least 2 characters.');
    if (!sku || sku.length < 2)           return showError('SKU must be at least 2 characters.');
    if (isNaN(price) || price < 0)        return showError('Price must be a non-negative number.');
    if (isNaN(cost)  || cost < 0)         return showError('Cost must be a non-negative number.');
    if (cost > price)                      return showError('Cost cannot be greater than price.');

    document.getElementById('form-error').style.display = 'none';

    const payload = {
        name, sku, price, cost,
        description: document.getElementById('f-desc').value.trim() || null,
        brand:       document.getElementById('f-brand').value.trim() || null,
        category_id: parseInt(document.getElementById('f-cat').value) || null,
        supplier_id: parseInt(document.getElementById('f-sup').value) || null,
        image_url:   document.getElementById('f-img').value.trim() || null,
    };

    const saveBtn = document.querySelector('.modal-footer .btn-primary');
    saveBtn.textContent = 'Saving…';
    saveBtn.disabled = true;

    try {
        if (editingId !== null) {
            payload.is_active = document.getElementById('f-status').value === 'true';
            const { data } = await apiFetch(`/products/${editingId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            const idx = allProducts.findIndex(p => p.id === editingId);
            allProducts[idx] = { ...allProducts[idx], ...data };
        } else {
            const { data } = await apiFetch('/products', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            allProducts.push(data);
        }
        closeModal();
        renderAll();
    } catch (err) {
        showError(err.message);
    } finally {
        saveBtn.textContent = 'Save product';
        saveBtn.disabled = false;
    }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteProduct(id, name) {
    if (!confirm(`Delete "${name}"?\n\nThis cannot be undone. Products with existing inventory records cannot be deleted.`)) return;

    try {
        await apiFetch(`/products/${id}`, { method: 'DELETE' });
        allProducts = allProducts.filter(p => p.id !== id);
        renderAll();
    } catch (err) {
        alert(`Delete failed: ${err.message}`);
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
fetchProducts();