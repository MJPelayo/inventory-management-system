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
        this.refreshTimer = null;
        this.isRefreshing = false;
        this.refreshPromise = null;
        this.loadUserFromStorage();
        this.startRefreshTimer(); // Start automatic refresh timer
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
     * Start automatic token refresh timer
     * Refreshes token 5 minutes before expiration
     */
    startRefreshTimer() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        
        if (!this.token) return;
        
        try {
            const decoded = this.decodeToken(this.token);
            if (!decoded || !decoded.exp) return;
            
            const now = Math.floor(Date.now() / 1000);
            const timeToExpiry = decoded.exp - now;
            
            // Refresh 5 minutes before expiration (or 300 seconds)
            const refreshIn = Math.max(0, timeToExpiry - 300) * 1000;
            
            if (refreshIn > 0) {
                this.refreshTimer = setTimeout(() => {
                    this.refreshToken();
                }, refreshIn);
                console.log(`Token refresh scheduled in ${Math.floor(refreshIn / 1000)} seconds`);
            } else if (timeToExpiry > 0) {
                // Token expires soon, refresh immediately
                this.refreshToken();
            }
        } catch (error) {
            console.error('Failed to start refresh timer:', error);
        }
    }

    /**
     * Decode JWT token without verification
     */
    decodeToken(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Failed to decode token:', error);
            return null;
        }
    }

    /**
     * Show session expiry warning
     */
    showSessionWarning() {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'session-warning';
        warningDiv.innerHTML = `
            <div class="session-warning-content">
                <p>⚠️ Your session will expire in 5 minutes.</p>
                <button onclick="window.refreshToken()" class="btn btn-primary btn-sm">Stay Logged In</button>
                <button onclick="this.closest('.session-warning').remove()" class="btn btn-secondary btn-sm">Dismiss</button>
            </div>
        `;
        document.body.appendChild(warningDiv);
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (warningDiv.parentNode) warningDiv.remove();
        }, 30000);
    }

    /**
     * Refresh the JWT token
     */
    async refreshToken() {
        if (this.isRefreshing) {
            // Wait for existing refresh to complete
            return this.refreshPromise;
        }
        
        this.isRefreshing = true;
        this.refreshPromise = this._performRefresh();
        
        try {
            return await this.refreshPromise;
        } finally {
            this.isRefreshing = false;
            this.refreshPromise = null;
        }
    }

    async _performRefresh() {
        if (!this.token) {
            console.log('No token to refresh');
            return false;
        }
        
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                const newToken = data.data.token;
                this.token = newToken;
                localStorage.setItem(CONFIG.TOKEN_KEY, newToken);
                
                // Restart timer with new token
                this.startRefreshTimer();
                
                console.log('Token refreshed successfully');
                return true;
            } else {
                console.error('Token refresh failed:', data.error);
                
                // If refresh fails due to expired token, redirect to login
                if (response.status === 401 || response.status === 403) {
                    this.logout();
                }
                return false;
            }
        } catch (error) {
            console.error('Token refresh network error:', error);
            return false;
        }
    }

    /**
     * Add token refresh interceptor to all API calls
     * This wraps apiCall to automatically refresh on 401
     */
    async apiCallWithRefresh(endpoint, options = {}) {
        try {
            return await apiCall(endpoint, options);
        } catch (error) {
            // Check if error is due to expired token (401)
            if (error.message && error.message.includes('401')) {
                console.log('Token expired, attempting refresh...');
                
                const refreshed = await this.refreshToken();
                
                if (refreshed) {
                    // Retry the original request with new token
                    console.log('Token refreshed, retrying request...');
                    return await apiCall(endpoint, options);
                } else {
                    // Refresh failed, redirect to login
                    this.logout();
                    throw new Error('Session expired. Please login again.');
                }
            }
            throw error;
        }
    }

    /**
     * Logout current user
     * Override to clear timer
     */
    logout() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        this.token = null;
        this.user = null;
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        localStorage.removeItem(CONFIG.USER_KEY);
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

// At the end of auth.js, after creating auth instance
// Set reference in config.js for API calls
if (typeof setAuthReference !== 'undefined') {
    setAuthReference(auth);
}

// Also expose refresh method globally
window.refreshToken = () => auth.refreshToken();
