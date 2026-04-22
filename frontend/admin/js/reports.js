const API_BASE = "http://localhost:3000/api";

// ─── API ──────────────────────────────────────────────────────────────────────
// Fetch JSON from backend and return the `data` array shape used by this project.
async function fetchList(path) {
    const res = await fetch(`${API_BASE}${path}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
    return Array.isArray(json.data) ? json.data : [];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPercent(value) {
    return `${value.toFixed(1)}%`;
}

// ─── Loading / Error states ───────────────────────────────────────────────────
function setLoadingState() {
    const grid = document.getElementById("kpiGrid");
    if (!grid) return;
    grid.innerHTML = '<div class="kpi-empty">Loading overview KPIs...</div>';
}

function setErrorState(message) {
    const grid = document.getElementById("kpiGrid");
    if (!grid) return;
    grid.innerHTML = `<div class="kpi-empty kpi-error">Failed to load KPIs: ${message}</div>`;
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderKpis({ products, users, warehouses }) {
    const grid = document.getElementById("kpiGrid");
    if (!grid) return;

    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.is_active).length;
    const totalUsers = users.length;

    // Calculate average warehouse utilization (only for warehouses with capacity > 0)
    const warehousesWithCapacity = warehouses.filter((w) => Number(w.capacity) > 0);
    const avgUtilization = warehousesWithCapacity.length
        ? warehousesWithCapacity.reduce((acc, w) => {
            const occupancy = Number(w.current_occupancy) || 0;
            const capacity = Number(w.capacity) || 0;
            return acc + (capacity ? (occupancy / capacity) * 100 : 0);
        }, 0) / warehousesWithCapacity.length
        : 0;

    // Count active users and warehouses
    const activeUsers = users.filter((u) => u.is_active).length;
    const activeWarehouses = warehouses.filter((w) => w.is_active).length;

    // Render KPIs in grid
    grid.innerHTML = `
        <div class="stat">
            <div class="stat-label">Total products</div>
            <div class="stat-value">${totalProducts}</div>
            <div class="stat-sub">${activeProducts} active</div>
        </div>
        <div class="stat">
            <div class="stat-label">Active products</div>
            <div class="stat-value">${activeProducts}</div>
            <div class="stat-sub">${totalProducts - activeProducts} inactive</div>
        </div>
        <div class="stat">
            <div class="stat-label">Total users</div>
            <div class="stat-value">${totalUsers}</div>
            <div class="stat-sub">${activeUsers} active users</div>
        </div>
        <div class="stat">
            <div class="stat-label">Avg warehouse use</div>
            <div class="stat-value">${formatPercent(avgUtilization)}</div>
            <div class="stat-sub">${activeWarehouses}/${warehouses.length} active warehouses</div>
        </div>
    `;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function loadOverviewKpis() {
    setLoadingState(); // Show loading state while fetching data
    try { // Fetch all necessary data in parallel
        const [products, users, warehouses] = await Promise.all([
            fetchList("/products"), // Fetch products for KPIs
            fetchList("/users"), // Fetch users for KPIs
            fetchList("/warehouses") // Fetch warehouses for KPIs
        ]);

        renderKpis({ products, users, warehouses }); // Render KPIs with the fetched data
    } catch (error) {
        setErrorState(error.message); // Show error state if any fetch fails
    }
}

document.addEventListener("DOMContentLoaded", loadOverviewKpis); // Load KPIs when the page is ready
