// frontend/auth.js - Authentication and Authorization Utility

const Auth = {
    STORAGE_KEY: 'ims_auth',
    
    // Login and store user data
    login(authData) {
        const authInfo = {
            user: authData.user,
            token: authData.token,
            permissions: authData.permissions,
            accessibleRoutes: authData.accessibleRoutes,
            roleLevel: authData.roleLevel,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authInfo));
    },
    
    // Logout and clear stored data
    logout() {
        localStorage.removeItem(this.STORAGE_KEY);
        window.location.href = 'login.html';
    },
    
    // Get stored auth data
    getAuthData() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (!stored) return null;
        try {
            return JSON.parse(stored);
        } catch (e) {
            return null;
        }
    },
    
    // Get current user
    getUser() {
        const auth = this.getAuthData();
        return auth ? auth.user : null;
    },
    
    // Get current token
    getToken() {
        const auth = this.getAuthData();
        return auth ? auth.token : null;
    },
    
    // Check if user is authenticated
    isAuthenticated() {
        const auth = this.getAuthData();
        if (!auth || !auth.token) return false;
        
        // Optional: Check if session expired (e.g., 8 hours)
        if (auth.loginTime) {
            const loginTime = new Date(auth.loginTime);
            const now = new Date();
            const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
            if (hoursSinceLogin > 8) {
                this.logout();
                return false;
            }
        }
        return true;
    },
    
    // Get user's role
    getRole() {
        const user = this.getUser();
        return user ? user.role : null;
    },
    
    // Check if user has specific permission
    hasPermission(permission) {
        const auth = this.getAuthData();
        if (!auth || !auth.permissions) return false;
        return auth.permissions.includes(permission);
    },
    
    // Check if user can access a route/section
    canAccess(section) {
        const auth = this.getAuthData();
        if (!auth) return false;
        
        // Admin has access to everything
        if (auth.accessibleRoutes.includes('*')) return true;
        
        return auth.accessibleRoutes.some(route => 
            section.startsWith(route) || route === '*'
        );
    },
    
    // Check if user has a specific role
    isRole(role) {
        return this.getRole() === role;
    },
    
    // Check if user is admin
    isAdmin() {
        return this.isRole('admin');
    },
    
    // Get dashboard URL based on role
    getDashboardForRole(role) {
        const dashboards = {
            admin: 'dashboard.html',
            sales: 'orders.html',
            warehouse: 'Warehouse.html',
            supply: 'supply-orders.html'
        };
        return dashboards[role] || 'Products.html';
    },
    
    // Get headers for API requests including auth token
    getAuthHeaders() {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    },
    
    // Make authenticated fetch request
    async fetch(url, options = {}) {
        const headers = this.getAuthHeaders();
        
        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...(options.headers || {})
            }
        });
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
            this.logout();
            throw new Error('Session expired. Please log in again.');
        }
        
        // Handle 403 Forbidden
        if (response.status === 403) {
            throw new Error('You do not have permission to perform this action.');
        }
        
        return response;
    },
    
    // Require authentication - redirect to login if not authenticated
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },
    
    // Require specific role - redirect if user doesn't have the role
    requireRole(...allowedRoles) {
        if (!this.requireAuth()) return false;
        
        const currentRole = this.getRole();
        if (!allowedRoles.includes(currentRole) && !this.isAdmin()) {
            // Redirect to their appropriate page
            window.location.href = this.getDashboardForRole(currentRole);
            return false;
        }
        return true;
    },
    
    // Initialize auth state and set up global helpers
    init() {
        // Check auth on page load
        if (!this.isAuthenticated() && !window.location.pathname.endsWith('login.html')) {
            // Don't redirect on login page itself
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
        }
        
        // Make Auth available globally
        window.Auth = this;
        
        return this;
    }
};

// Role-based UI helpers
const RBAC = {
    // Show element only if user has permission
    showIfPermission(permission, selector) {
        if (Auth.hasPermission(permission)) {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = '';
            });
        } else {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
            });
        }
    },
    
    // Show element only if user has role
    showIfRole(roles, selector) {
        const roleArray = Array.isArray(roles) ? roles : [roles];
        const userRole = Auth.getRole();
        
        if (roleArray.includes(userRole) || Auth.isAdmin()) {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = '';
            });
        } else {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
            });
        }
    },
    
    // Hide element if user doesn't have permission
    hideIfNoPermission(permission, selector) {
        this.showIfPermission(permission, selector);
    },
    
    // Disable button if user doesn't have permission
    disableIfNoPermission(permission, selector) {
        if (!Auth.hasPermission(permission)) {
            document.querySelectorAll(selector).forEach(el => {
                el.disabled = true;
                el.title = 'You do not have permission for this action';
            });
        }
    },
    
    // Apply all RBAC rules on a page
    applyRules(rules) {
        rules.forEach(rule => {
            if (rule.type === 'permission') {
                this.showIfPermission(rule.permission, rule.selector);
            } else if (rule.type === 'role') {
                this.showIfRole(rule.roles, rule.selector);
            }
        });
    },
    
    // Get navigation items based on user role
    getNavItems() {
        const role = Auth.getRole();
        const navConfigs = {
            admin: [
                { id: 'dashboard', label: 'Dashboard', icon: 'grid', href: 'dashboard.html' },
                { id: 'products', label: 'Products', icon: 'package', href: 'Products.html' },
                { id: 'warehouses', label: 'Warehouses', icon: 'warehouse', href: 'Warehouse.html' },
                { id: 'users', label: 'Users', icon: 'users', href: 'users.html', requires: 'user:read' },
                { id: 'orders', label: 'Orders', icon: 'cart', href: 'orders.html' },
                { id: 'suppliers', label: 'Suppliers', icon: 'truck', href: 'suppliers.html' },
                { id: 'reports', label: 'Reports', icon: 'chart', href: 'reports.html' }
            ],
            sales: [
                { id: 'dashboard', label: 'Dashboard', icon: 'grid', href: 'dashboard.html' },
                { id: 'products', label: 'Products', icon: 'package', href: 'Products.html' },
                { id: 'orders', label: 'Orders', icon: 'cart', href: 'orders.html' },
                { id: 'customers', label: 'Customers', icon: 'users', href: 'customers.html' },
                { id: 'reports', label: 'My Reports', icon: 'chart', href: 'reports-sales.html' }
            ],
            warehouse: [
                { id: 'dashboard', label: 'Dashboard', icon: 'grid', href: 'dashboard.html' },
                { id: 'products', label: 'Products', icon: 'package', href: 'Products.html' },
                { id: 'warehouses', label: 'Warehouses', icon: 'warehouse', href: 'Warehouse.html' },
                { id: 'inventory', label: 'Inventory', icon: 'boxes', href: 'inventory.html' },
                { id: 'stock', label: 'Stock Movements', icon: 'exchange', href: 'stock-movements.html' },
                { id: 'reports', label: 'Warehouse Reports', icon: 'chart', href: 'reports-warehouse.html' }
            ],
            supply: [
                { id: 'dashboard', label: 'Dashboard', icon: 'grid', href: 'dashboard.html' },
                { id: 'products', label: 'Products', icon: 'package', href: 'Products.html' },
                { id: 'suppliers', label: 'Suppliers', icon: 'truck', href: 'suppliers.html' },
                { id: 'supply-orders', label: 'Purchase Orders', icon: 'file', href: 'supply-orders.html' },
                { id: 'reports', label: 'Supply Reports', icon: 'chart', href: 'reports-supply.html' }
            ],
            sales_manager: [
                { id: 'dashboard', label: 'Dashboard', icon: 'grid', href: 'dashboard.html' },
                { id: 'sales-panel', label: 'Sales Manager', icon: 'briefcase', href: 'sales-manager.html' },
                { id: 'products', label: 'Products', icon: 'package', href: 'Products.html' },
                { id: 'orders', label: 'Orders', icon: 'cart', href: 'orders.html' },
                { id: 'customers', label: 'Customers', icon: 'users', href: 'customers.html' },
                { id: 'reports', label: 'Reports', icon: 'chart', href: 'reports-sales.html' }
            ]
        };
        
        return navConfigs[role] || navConfigs.sales_manager || navConfigs.sales;
    },
    
    // Render navigation based on role
    renderNavigation(containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        const navItems = this.getNavItems();
        const currentPath = window.location.pathname.split('/').pop();
        
        container.innerHTML = navItems.map(item => {
            // Check if item requires permission user doesn't have
            if (item.requires && !Auth.hasPermission(item.requires)) {
                return '';
            }
            
            const isActive = currentPath === item.href || 
                           (currentPath === '' && item.id === 'dashboard');
            
            return `
                <a class="nav-item ${isActive ? 'active' : ''}" href="${item.href}">
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${this.getIconPath(item.icon)}
                    </svg>
                    ${item.label}
                </a>
            `;
        }).join('');
        
        // Add logout button
        container.innerHTML += `
            <div style="margin-top: auto; border-top: 1px solid var(--border); padding-top: 1rem;">
                <div class="nav-item" onclick="Auth.logout()" style="color: var(--red);">
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Logout
                </div>
            </div>
        `;
        
        // Add user info
        const user = Auth.getUser();
        if (user) {
            const userInfo = document.createElement('div');
            userInfo.style.cssText = 'padding: 0.5rem; margin-bottom: 0.5rem; font-size: 11px; color: var(--text-3);';
            userInfo.innerHTML = `
                <div style="font-weight: 500; color: var(--text);">${user.name}</div>
                <div>${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</div>
            `;
            container.insertBefore(userInfo, container.lastElementChild);
        }
    },
    
    // Get SVG icon path by name
    getIconPath(name) {
        const icons = {
            grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
            package: '<path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
            warehouse: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
            users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
            cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
            truck: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
            chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
            boxes: '<path d="M2.97 12.92A2 2 0 0 0 2 14.61v3.64a2 2 0 0 0 .97 1.69l8 4.44a2 2 0 0 0 2.06 0l8-4.44a2 2 0 0 0 .97-1.69v-3.64a2 2 0 0 0-.97-1.69l-8-4.44a2 2 0 0 0-2.06 0l-8 4.44z"/><path d="m12 4 8 4.44"/><path d="m12 4-8 4.44"/><path d="M12 4v8.89"/>',
            exchange: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
            file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
            briefcase: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'
        };
        return icons[name] || icons.grid;
    }
};

// Auto-initialize on pages that include this script
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        Auth.init();
    });
}