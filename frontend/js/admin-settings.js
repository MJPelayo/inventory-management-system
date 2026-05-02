// frontend/js/admin-settings.js

let currentUserPermissions = {};
let allUsers = [];

// Permission level options
const PERMISSION_LEVELS = {
    'none': { label: '❌ No Access', value: 0 },
    'read': { label: '👁️ View Only', value: 1 },
    'create': { label: '➕ Create & View', value: 2 },
    'edit': { label: '✏️ Edit, Create & View', value: 3 },
    'delete': { label: '🗑️ Full CRUD (no perm mgmt)', value: 4 },
    'full': { label: '👑 Full Access + Permissions', value: 5 }
};

// Modules that can be configured
const MODULES = [
    { name: 'products', label: '📦 Products' },
    { name: 'suppliers', label: '🏭 Suppliers' },
    { name: 'warehouses', label: '🏢 Warehouses' },
    { name: 'users', label: '👥 Users' },
    { name: 'reports', label: '📊 Reports' },
    { name: 'orders', label: '📋 Orders' },
    { name: 'inventory', label: '📦 Inventory' },
    { name: 'settings', label: '⚙️ System Settings' }
];

document.addEventListener('DOMContentLoaded', async () => {
    if (!auth.isLoggedIn() || !auth.hasRole('admin')) {
        window.location.href = '/index.html';
        return;
    }
    
    new Header('appHeader');
    new Sidebar('sidebar', 'settings');
    
    await loadUsers();
    await setupTabs();
    await loadAuditLog();
});

async function loadUsers() {
    try {
        const response = await apiCall('/users');
        allUsers = response.data || [];
        
        const userSelect = document.getElementById('userSelect');
        const roleFilter = document.getElementById('roleFilter');
        
        filterUsers();
        
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

function filterUsers() {
    const roleFilter = document.getElementById('roleFilter').value;
    const userSelect = document.getElementById('userSelect');
    
    let filteredUsers = allUsers;
    if (roleFilter) {
        filteredUsers = allUsers.filter(u => u.role === roleFilter);
    }
    
    userSelect.innerHTML = '<option value="">-- Select User --</option>' +
        filteredUsers.map(u => `<option value="${u.id}" ${u.is_protected ? 'data-protected="true"' : ''}>${escapeHtml(u.name)} (${u.role}) ${u.is_protected ? '🔒' : ''}</option>`).join('');
}

async function loadUserPermissions() {
    const userId = document.getElementById('userSelect').value;
    if (!userId) {
        document.getElementById('permissionsGrid').style.display = 'none';
        return;
    }
    
    const user = allUsers.find(u => u.id == userId);
    document.getElementById('selectedUserName').textContent = user.name;
    document.getElementById('userRoleBadge').textContent = user.role;
    document.getElementById('userRoleBadge').className = `badge badge-${user.role}`;
    
    if (user.is_protected) {
        document.getElementById('protectedBadge').style.display = 'block';
    } else {
        document.getElementById('protectedBadge').style.display = 'none';
    }
    
    try {
        const response = await apiCall(`/users/${userId}/permissions`);
        currentUserPermissions = response.data || {};
        
        const tbody = document.querySelector('.permissions-table tbody');
        tbody.innerHTML = MODULES.map(module => {
            const currentLevel = currentUserPermissions[module.name] || 'default';
            const isProtected = user.is_protected;
            const isCurrentUser = user.id == auth.getCurrentUser().id;
            
            let optionsHtml = '';
            for (const [level, config] of Object.entries(PERMISSION_LEVELS)) {
                let disabled = false;
                let note = '';
                
                // Protected users cannot have their permissions reduced
                if (isProtected && level !== 'full') {
                    disabled = true;
                    note = ' (Protected account)';
                }
                
                // Admin cannot remove their own full access
                if (isCurrentUser && level !== 'full') {
                    disabled = true;
                    note = ' (Cannot modify own permissions)';
                }
                
                optionsHtml += `<option value="${level}" ${currentLevel === level ? 'selected' : ''} ${disabled ? 'disabled' : ''}>${config.label}${note}</option>`;
            }
            
            return `
                <tr>
                    <td>${module.label}</td>
                    <td>
                        <select class="perm-select" data-module="${module.name}" ${isProtected || isCurrentUser ? 'disabled' : ''}>
                            <option value="default">🎯 Use Role Default</option>
                            ${optionsHtml}
                        </select>
                    </td>
                    <td class="perm-desc">${getPermissionDescription(module.name)}</td>
                    <td>
                        ${currentLevel !== 'default' && !isProtected && !isCurrentUser ? 
                            `<button class="btn-icon" onclick="clearPermission('${module.name}')" title="Clear Override">✖️</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
        
        document.getElementById('permissionsGrid').style.display = 'block';
        
    } catch (error) {
        console.error('Failed to load permissions:', error);
        showToast('Failed to load permissions', 'error');
    }
}

function getPermissionDescription(module) {
    const descriptions = {
        'products': 'Manage product catalog, prices, and status',
        'suppliers': 'Manage supplier information and relationships',
        'warehouses': 'Manage warehouse locations and capacity',
        'users': 'Create, edit, and delete system users',
        'reports': 'View and export system reports',
        'orders': 'Manage sales and purchase orders',
        'inventory': 'View and manage stock levels',
        'settings': 'Configure system settings and permissions'
    };
    return descriptions[module] || '';
}

async function savePermissions() {
    const userId = document.getElementById('userSelect').value;
    if (!userId) {
        showToast('Please select a user first', 'error');
        return;
    }
    
    const permissions = {};
    document.querySelectorAll('.perm-select').forEach(select => {
        const module = select.dataset.module;
        const value = select.value;
        if (value !== 'default') {
            permissions[module] = value;
        }
    });
    
    try {
        await apiCall(`/users/${userId}/permissions`, {
            method: 'PUT',
            body: JSON.stringify({ permissions })
        });
        
        showToast('Permissions saved successfully', 'success');
        await loadUserPermissions(); // Refresh
        await loadAuditLog(); // Log the change
        
    } catch (error) {
        showToast(error.message || 'Failed to save permissions', 'error');
    }
}

async function clearPermission(module) {
    const select = document.querySelector(`.perm-select[data-module="${module}"]`);
    if (select) {
        select.value = 'default';
        await savePermissions();
    }
}

async function resetUserPermissions() {
    const userId = document.getElementById('userSelect').value;
    if (!userId) return;
    
    if (!confirm('Reset all permissions for this user to role defaults?')) return;
    
    try {
        await apiCall(`/users/${userId}/permissions/reset`, { method: 'POST' });
        showToast('Permissions reset to role defaults', 'success');
        await loadUserPermissions();
        
    } catch (error) {
        showToast(error.message || 'Failed to reset permissions', 'error');
    }
}

async function loadAuditLog() {
    const container = document.getElementById('auditLogTable');
    try {
        const response = await apiCall('/audit/permissions');
        const logs = response.data || [];
        
        if (logs.length === 0) {
            container.innerHTML = '<div class="empty-state">No permission changes recorded</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="audit-table">
                <thead>
                    <tr><th>Date</th><th>Changed By</th><th>User</th><th>Module</th><th>Change</th></tr>
                </thead>
                <tbody>
                    ${logs.map(log => `
                        <tr>
                            <td>${new Date(log.changed_at).toLocaleString()}</td>
                            <td>${escapeHtml(log.changed_by_name)} (${log.changed_by_role})</td>
                            <td>${escapeHtml(log.user_name)}</td>
                            <td>${log.module}</td>
                            <td>${log.old_permission || 'none'} → ${log.new_permission || 'none'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        container.innerHTML = '<div class="error-state">Failed to load audit log</div>';
    }
}

function refreshAuditLog() {
    loadAuditLog();
    showToast('Audit log refreshed', 'info');
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.settings-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            document.getElementById(`${tabId}Tab`).classList.add('active');
        });
    });
}

async function saveRoleDefaults() {
    const salesPerms = {};
    document.querySelectorAll('#salesPermissions .role-perm-checkbox').forEach(cb => {
        salesPerms[cb.dataset.module] = cb.checked;
    });
    
    const warehousePerms = {};
    document.querySelectorAll('#warehousePermissions .role-perm-checkbox').forEach(cb => {
        warehousePerms[cb.dataset.module] = cb.checked;
    });
    
    const supplyPerms = {};
    document.querySelectorAll('#supplyPermissions .role-perm-checkbox').forEach(cb => {
        supplyPerms[cb.dataset.module] = cb.checked;
    });
    
    try {
        await apiCall('/settings/role-defaults', {
            method: 'PUT',
            body: JSON.stringify({
                sales: salesPerms,
                warehouse: warehousePerms,
                supply: supplyPerms
            })
        });
        showToast('Role defaults saved', 'success');
    } catch (error) {
        showToast('Failed to save role defaults', 'error');
    }
}

function resetRoleDefaults() {
    if (confirm('Reset all role defaults to factory settings?')) {
        location.reload();
    }
}

async function saveSystemSettings() {
    const settings = {
        session_timeout: parseInt(document.getElementById('sessionTimeout').value),
        password_expiry_days: parseInt(document.getElementById('passwordExpiry').value),
        max_login_attempts: parseInt(document.getElementById('maxLoginAttempts').value),
        default_tax_rate: parseFloat(document.getElementById('defaultTaxRate').value),
        discount_approval_threshold: parseFloat(document.getElementById('discountApprovalThreshold').value),
        low_stock_threshold: parseInt(document.getElementById('lowStockThreshold').value),
        email_notifications: document.getElementById('emailNotifications').checked,
        slack_notifications: document.getElementById('slackNotifications').checked,
        slack_webhook: document.getElementById('slackWebhook').value
    };
    
    try {
        await apiCall('/settings/system', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
        showToast('System settings saved', 'success');
    } catch (error) {
        showToast('Failed to save system settings', 'error');
    }
}

function resetSystemSettings() {
    if (confirm('Reset all system settings to defaults?')) {
        document.getElementById('sessionTimeout').value = 1440;
        document.getElementById('passwordExpiry').value = 90;
        document.getElementById('maxLoginAttempts').value = 5;
        document.getElementById('defaultTaxRate').value = 10;
        document.getElementById('discountApprovalThreshold').value = 10;
        document.getElementById('lowStockThreshold').value = 10;
        document.getElementById('emailNotifications').checked = false;
        document.getElementById('slackNotifications').checked = false;
        document.getElementById('slackWebhook').value = '';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showToast(message, type) {
    let toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Export functions
window.loadUserPermissions = loadUserPermissions;
window.savePermissions = savePermissions;
window.resetUserPermissions = resetUserPermissions;
window.clearPermission = clearPermission;
window.filterUsers = filterUsers;
window.refreshAuditLog = refreshAuditLog;
window.saveRoleDefaults = saveRoleDefaults;
window.resetRoleDefaults = resetRoleDefaults;
window.saveSystemSettings = saveSystemSettings;
window.resetSystemSettings = resetSystemSettings;