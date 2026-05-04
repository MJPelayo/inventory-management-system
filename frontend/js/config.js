// frontend/js/config.js
/**
 * Frontend Configuration
 * API endpoints and app settings
 *
 * @module config
 */

const CONFIG = {
    // Use relative path for same-origin requests
    API_BASE_URL: '/api',
    
    // OR if frontend and backend on different ports during development:
    // API_BASE_URL: 'http://localhost:3000/api',
    
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

// Store reference to auth for interceptor
let authInstance = null;

// Helper function to get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem(CONFIG.TOKEN_KEY);
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// Helper function for API calls with auto-refresh
async function apiCall(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const headers = getAuthHeaders();
    
    const makeRequest = async () => {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        });
        
        // For binary responses (PDF, CSV), return raw response
        const contentType = response.headers.get('content-type');
        if (contentType && (contentType.includes('application/pdf') || contentType.includes('text/csv'))) {
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }
            return response;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            const error = new Error(data.error || `API Error: ${response.status}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }
        
        return data;
    };
    
    try {
        return await makeRequest();
    } catch (error) {
        // Handle 401 Unauthorized - try to refresh token
        if (error.status === 401 && authInstance && authInstance.isLoggedIn()) {
            console.log('API call failed with 401, attempting token refresh...');
            
            const refreshed = await authInstance.refreshToken();
            
            if (refreshed) {
                // Update headers with new token and retry
                const newHeaders = getAuthHeaders();
                if (options.headers) {
                    Object.assign(options.headers, newHeaders);
                } else {
                    options.headers = newHeaders;
                }
                
                console.log('Token refreshed, retrying API call...');
                const retryResponse = await fetch(url, {
                    ...options,
                    headers: options.headers
                });
                
                const retryData = await retryResponse.json();
                if (!retryResponse.ok) {
                    throw new Error(retryData.error || `API Error: ${retryResponse.status}`);
                }
                return retryData;
            } else {
                // Refresh failed
                if (authInstance) authInstance.logout();
                throw new Error('Session expired. Please login again.');
            }
        }
        throw error;
    }
}

// Set auth reference after it's initialized
function setAuthReference(auth) {
    authInstance = auth;
}

// Session activity tracking to keep token alive longer
let activityTimeout = null;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function resetActivityTimer() {
    if (activityTimeout) {
        clearTimeout(activityTimeout);
    }
    
    activityTimeout = setTimeout(() => {
        console.log('User inactive for 30 minutes');
        // Optional: Show warning or auto-logout
        // For now, just log
    }, SESSION_TIMEOUT);
}

// Track user activity
document.addEventListener('click', resetActivityTimer);
document.addEventListener('keypress', resetActivityTimer);
document.addEventListener('mousemove', resetActivityTimer);
resetActivityTimer();

// Log the configuration (for debugging)
console.log('✅ Config loaded:', CONFIG.API_BASE_URL);
