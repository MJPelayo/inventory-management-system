// frontend/js/components.js
/**
 * Shared UI Components
 * Reusable components across all dashboards
 * 
 * @module components
 */

// Sidebar navigation component
class Sidebar {
    constructor(containerId, activePage = null) {
        this.container = document.getElementById(containerId);
        this.activePage = activePage;
        this.render();
    }
    
    getNavItems() {
        const role = auth.getCurrentRole();
        
        const dashboards = {
            admin: [
                { icon: '📊', text: 'Dashboard', href: 'dashboard.html', page: 'dashboard' },
                { icon: '👥', text: 'Users', href: 'users.html', page: 'users' },
                { icon: '📦', text: 'Products', href: 'products.html', page: 'products' },
                { icon: '🏷️', text: 'Categories', href: 'categories.html', page: 'categories' },
                { icon: '🏭', text: 'Suppliers', href: 'suppliers.html', page: 'suppliers' },
                { icon: '🏢', text: 'Warehouses', href: 'warehouses.html', page: 'warehouses' },
                { icon: '📈', text: 'Reports', href: 'reports.html', page: 'reports' }
            ],
            sales: [
                { icon: '📊', text: 'Dashboard', href: 'dashboard.html', page: 'dashboard' },
                { icon: '📦', text: 'Products', href: 'products.html', page: 'products' },
                { icon: '🛒', text: 'Cart', href: 'cart.html', page: 'cart' },
                { icon: '📋', text: 'Orders', href: 'orders.html', page: 'orders' },
                { icon: '👤', text: 'Customers', href: 'customers.html', page: 'customers' }
            ],
            warehouse: [
                { icon: '📊', text: 'Dashboard', href: 'dashboard.html', page: 'dashboard' },
                { icon: '📦', text: 'Inventory', href: 'inventory.html', page: 'inventory' },
                { icon: '📥', text: 'Receive Stock', href: 'receiving.html', page: 'receiving' },
                { icon: '🔄', text: 'Transfers', href: 'transfers.html', page: 'transfers' },
                { icon: '📝', text: 'Pick Lists', href: 'picklists.html', page: 'picklists' }
            ],
            supply: [
                { icon: '📊', text: 'Dashboard', href: 'dashboard.html', page: 'dashboard' },
                { icon: '📄', text: 'Purchase Orders', href: 'purchase-orders.html', page: 'purchase-orders' },
                { icon: '🏭', text: 'Suppliers', href: 'suppliers.html', page: 'suppliers' },
                { icon: '🔄', text: 'Reorder', href: 'reorder.html', page: 'reorder' }
            ]
        };
        
        return dashboards[role] || dashboards.admin;
    }
    
    render() {
        const navItems = this.getNavItems();
        const currentRole = auth.getCurrentRole();
        
        this.container.innerHTML = `
            <div class="sidebar-header">
                <div class="logo">inventory<span>.app</span></div>
                <div class="user-badge">
                    <span class="user-role">${currentRole}</span>
                    <span class="user-name">${auth.getCurrentUser()?.name || 'User'}</span>
                </div>
            </div>
            <nav class="sidebar-nav">
                ${navItems.map(item => `
                    <a href="${item.href}" class="nav-item ${this.activePage === item.page ? 'active' : ''}" data-page="${item.page}">
                        <span class="nav-icon">${item.icon}</span>
                        <span class="nav-text">${item.text}</span>
                    </a>
                `).join('')}
            </nav>
            <div class="sidebar-footer">
                <button class="logout-btn" onclick="auth.logout()">
                    <span class="nav-icon">🚪</span>
                    <span class="nav-text">Logout</span>
                </button>
            </div>
        `;
    }
}

// Header component
class Header {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.render();
    }
    
    render() {
        const user = auth.getCurrentUser();
        this.container.innerHTML = `
            <div class="header-left">
                <h1>Inventory Management System</h1>
            </div>
            <div class="header-right">
                <div class="header-user">
                    <span class="user-name">${user?.name || 'User'}</span>
                    <span class="user-role">${user?.role || 'role'}</span>
                </div>
            </div>
        `;
    }
}

// Table component for reusable tables
class DataTable {
    constructor(containerId, columns, options = {}) {
        this.container = document.getElementById(containerId);
        this.columns = columns;
        this.data = [];
        this.options = {
            itemsPerPage: 10,
            searchable: true,
            sortable: true,
            ...options
        };
        this.currentPage = 1;
        this.searchTerm = '';
        this.sortColumn = null;
        this.sortDirection = 'asc';
        
        this.renderControls();
    }
    
    renderControls() {
        if (!this.options.searchable) return;
        
        const searchHtml = `
            <div class="table-toolbar">
                <div class="search-wrap">
                    <input type="text" id="tableSearch" placeholder="Search..." class="search-input">
                </div>
            </div>
        `;
        this.container.insertAdjacentHTML('beforebegin', searchHtml);
        
        document.getElementById('tableSearch')?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.currentPage = 1;
            this.render();
        });
    }
    
    setData(data) {
        this.data = data;
        this.render();
    }
    
    getFilteredData() {
        let filtered = [...this.data];
        
        if (this.searchTerm) {
            filtered = filtered.filter(row => {
                return Object.values(row).some(value => 
                    String(value).toLowerCase().includes(this.searchTerm)
                );
            });
        }
        
        if (this.sortColumn) {
            filtered.sort((a, b) => {
                let aVal = a[this.sortColumn];
                let bVal = b[this.sortColumn];
                
                if (typeof aVal === 'number') {
                    return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                }
                
                const comparison = String(aVal).localeCompare(String(bVal));
                return this.sortDirection === 'asc' ? comparison : -comparison;
            });
        }
        
        return filtered;
    }
    
    render() {
        const filtered = this.getFilteredData();
        const totalPages = Math.ceil(filtered.length / this.options.itemsPerPage);
        const start = (this.currentPage - 1) * this.options.itemsPerPage;
        const pageData = filtered.slice(start, start + this.options.itemsPerPage);
        
        // Render table
        let html = '<table class="data-table"><thead><tr>';
        this.columns.forEach(col => {
            const sortIcon = this.sortColumn === col.key ? (this.sortDirection === 'asc' ? ' ↑' : ' ↓') : '';
            html += `<th ${this.options.sortable ? `onclick="window.currentTable?.sort('${col.key}')" style="cursor:pointer"` : ''}>
                ${col.label}${sortIcon}
            </th>`;
        });
        html += '<th>Actions</th></tr></thead><tbody>';
        
        if (pageData.length === 0) {
            html += '<tr><td colspan="100%" class="empty-state">No data available</td></tr>';
        } else {
            pageData.forEach(row => {
                html += '<tr>';
                this.columns.forEach(col => {
                    html += `<td>${row[col.key] ?? '—'}</td>`;
                });
                html += `<td class="actions-cell">
                    ${this.options.onEdit ? `<button class="btn-sm" onclick="window.currentTable?.edit(${row.id})">Edit</button>` : ''}
                    ${this.options.onDelete ? `<button class="btn-sm btn-danger" onclick="window.currentTable?.delete(${row.id})">Delete</button>` : ''}
                </td>`;
                html += '</tr>';
            });
        }
        
        html += '</tbody></table>';
        
        // Pagination
        if (totalPages > 1) {
            html += '<div class="pagination">';
            for (let i = 1; i <= totalPages; i++) {
                html += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" onclick="window.currentTable?.goToPage(${i})">${i}</button>`;
            }
            html += '</div>';
        }
        
        this.container.innerHTML = html;
        window.currentTable = this;
    }
    
    sort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        this.render();
    }
    
    goToPage(page) {
        this.currentPage = page;
        this.render();
    }
    
    edit(id) {
        if (this.options.onEdit) this.options.onEdit(id);
    }
    
    delete(id) {
        if (this.options.onDelete && confirm('Are you sure?')) {
            this.options.onDelete(id);
        }
    }
}

// Export to global scope
window.Sidebar = Sidebar;
window.Header = Header;
window.DataTable = DataTable;

console.log('✅ Components module loaded');