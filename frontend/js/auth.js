// frontend/js/auth.js
/**
 * Authentication Module
 * Handles login, logout, and session management
 * 
 * @module auth
 */

class AuthManager {
    constructor() {
        this.token = localStorage.getItem(CONFIG.TOKEN_KEY);
        this.user = null;
        this.loadUserFromStorage();
    }
    
    /**
     * Load user from localStorage
     */
    loadUserFromStorage() {
        const userStr = localStorage.getItem(CONFIG.USER_KEY);
        if (userStr) {
            try {
                this.user = JSON.parse(userStr);
            } catch (e) {
                console.error('Failed to parse user from storage');
                this.user = null;
            }
        }
    }
    
    /**
     * Save user to localStorage
     */
    saveUserToStorage() {
        if (this.user) {
            localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(this.user));
        } else {
            localStorage.removeItem(CONFIG.USER_KEY);
        }
    }
    
    /**
     * Login user with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} Login response
     */
    async login(email, password) {
        try {
            const response = await apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            
            if (response.success && response.data) {
                this.token = response.data.token;
                this.user = response.data.user;
                
                localStorage.setItem(CONFIG.TOKEN_KEY, this.token);
                this.saveUserToStorage();
                
                return {
                    success: true,
                    user: this.user,
                    role: this.user.role
                };
            }
            
            return {
                success: false,
                error: response.error || 'Login failed'
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Logout current user
     */
    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        localStorage.removeItem(CONFIG.USER_KEY);
        
        // Redirect to login page
        window.location.href = '/index.html';
    }
    
    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    isLoggedIn() {
        return !!this.token && !!this.user;
    }
    
    /**
     * Get current user's role
     * @returns {string|null}
     */
    getCurrentRole() {
        return this.user?.role || null;
    }
    
    /**
     * Get current user
     * @returns {Object|null}
     */
    getCurrentUser() {
        return this.user;
    }
    
    /**
     * Check if user has specific role
     * @param {string|string[]} roles - Role or array of roles to check
     * @returns {boolean}
     */
    hasRole(roles) {
        if (!this.user) return false;
        
        const roleList = Array.isArray(roles) ? roles : [roles];
        return roleList.includes(this.user.role);
    }
    
    /**
     * Redirect to appropriate dashboard based on role
     */
    redirectToDashboard() {
        if (!this.user) {
            window.location.href = '/index.html';
            return;
        }
        
        const dashboards = {
            'admin': '/pages/admin/dashboard.html',
            'sales': '/pages/sales/dashboard.html',
            'warehouse': '/pages/warehouse/dashboard.html',
            'supply': '/pages/supply/dashboard.html'
        };
        
        const dashboardUrl = dashboards[this.user.role];
        if (dashboardUrl) {
            window.location.href = dashboardUrl;
        }
    }
}

// Create global auth instance
const auth = new AuthManager();

// Default test credentials (for demo purposes)
const DEFAULT_CREDENTIALS = {
    admin: { email: 'admin@ims.com', password: 'admin123' },
    sales: { email: 'sales@ims.com', password: 'sales123' },
    warehouse: { email: 'warehouse@ims.com', password: 'warehouse123' },
    supply: { email: 'supply@ims.com', password: 'supply123' }
};

console.log('✅ Auth module loaded');
