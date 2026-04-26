// frontend/js/config.js
/**
 * Frontend Configuration
 * API endpoints and app settings
 * 
 * @module config
 */

const CONFIG = {
    // API Base URL - use relative path since frontend and backend are on same port
    API_BASE_URL: '/api',
    
    // Token storage key
    TOKEN_KEY: 'ims_auth_token',
    
    // User storage key
    USER_KEY: 'ims_user',
    
    // App version
    VERSION: '1.0.0',
    
    // Pagination defaults
    ITEMS_PER_PAGE: 10,
    
    // Date format
    DATE_FORMAT: 'YYYY-MM-DD HH:mm:ss'
};

// Helper function to get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem(CONFIG.TOKEN_KEY);
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const headers = getAuthHeaders();
    
    const response = await fetch(url, {
        ...options,
        headers: {
            ...headers,
            ...options.headers
        }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.status}`);
    }
    
    return data;
}

// Log the configuration (for debugging)
console.log('✅ Config loaded:', CONFIG.API_BASE_URL);
