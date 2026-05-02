// frontend/js/admin-users.js

// ============================================
// GLOBAL VARIABLES
// ============================================
let usersTable = null;
let allUsers = [];

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin Users page loading...');
    
    if (!auth.isLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }
    
    if (!auth.hasRole('admin')) {
        alert('Access denied. Admin privileges required.');
        auth.logout();
        return;
    }
    
    new Header('appHeader');
    new Sidebar('sidebar', 'users');
    
    await loadUsers();
    setupEventListeners();
    setupRoleFieldToggle();
});

// ============================================
// HELPER FUNCTIONS
// ============================================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showToast(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function getRoleBadgeClass(role) {
    switch(role) {
        case 'admin': return 'badge-admin';
        case 'sales': return 'badge-sales';
        case 'warehouse': return 'badge-warehouse';
        case 'supply': return 'badge-supply';
        default: return 'badge-secondary';
    }
}

// ============================================
// TOGGLE ROLE-SPECIFIC FIELDS
// ============================================
function setupRoleFieldToggle() {
    const roleSelect = document.getElementById('userRole');
    const editRoleSelect = document.getElementById('editRole');
    
    if (roleSelect) {
        roleSelect.addEventListener('change', () => toggleRoleFields('userRole'));
    }
    if (editRoleSelect) {
        editRoleSelect.addEventListener('change', () => toggleRoleFields('editRole'));
    }
}

function toggleRoleFields(formType) {
    const roleSelect = document.getElementById(formType);
    const role = roleSelect?.value;
    
    const departmentGroup = document.getElementById(`${formType === 'userRole' ? 'departmentGroup' : 'editDepartmentGroup'}`);
    const salesTargetGroup = document.getElementById(`${formType === 'userRole' ? 'salesTargetGroup' : 'editSalesTargetGroup'}`);
    const warehouseGroup = document.getElementById(`${formType === 'userRole' ? 'warehouseGroup' : 'editWarehouseGroup'}`);
    const budgetGroup = document.getElementById(`${formType === 'userRole' ? 'budgetGroup' : 'editBudgetGroup'}`);
    
    if (departmentGroup) departmentGroup.style.display = role ? 'block' : 'none';
    if (salesTargetGroup) salesTargetGroup.style.display = role === 'sales' ? 'block' : 'none';
    if (warehouseGroup) warehouseGroup.style.display = role === 'warehouse' ? 'block' : 'none';
    if (budgetGroup) budgetGroup.style.display = role === 'supply' ? 'block' : 'none';
}

// ============================================
// LOAD USERS
// ============================================
async function loadUsers() {
    try {
        const searchTerm = document.getElementById('userSearch')?.value || '';
        const statusFilter = document.getElementById('userStatusFilter')?.value || 'all';
        const sortBy = document.getElementById('userSort')?.value || 'name';
        
        const response = await apiCall('/users');
        let users = response.data || [];
        
        // Client-side filtering
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            users = users.filter(u => 
                u.name.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term) ||
                u.role.toLowerCase().includes(term)
            );
        }
        
        if (statusFilter !== 'all') {
            users = users.filter(u => statusFilter === 'active' ? u.is_active : !u.is_active);
        }
        
        // Sorting
        users.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'email') return a.email.localeCompare(b.email);
            if (sortBy === 'role') return a.role.localeCompare(b.role);
            return 0;
        });
        
        allUsers = users;
        
        const formattedUsers = users.map(u => ({
            id: u.id,
            name: `<strong>${escapeHtml(u.name)}</strong>`,
            email: `<span class="mono">${escapeHtml(u.email)}</span>`,
            role: `<span class="badge ${getRoleBadgeClass(u.role)}">${escapeHtml(u.role)}</span>`,
            department: escapeHtml(u.department || '—'),
            status: u.is_active ? 
                '<span class="badge badge-success">Active</span>' : 
                '<span class="badge badge-danger">Inactive</span>',
            last_login: u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'
        }));
        
        const columns = [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'department', label: 'Department' },
            { key: 'status', label: 'Status' },
            { key: 'last_login', label: 'Last Login' }
        ];
        
        if (usersTable) {
            usersTable.setData(formattedUsers);
        } else {
            usersTable = new DataTable('usersTable', columns, {
                itemsPerPage: 10,
                searchable: false,
                sortable: true,
                onEdit: (id) => openUserModal(id),
                onDelete: (id) => deleteUser(id)
            });
            usersTable.setData(formattedUsers);
        }
        
        updateUserStats(users);
        
        console.log(`Loaded ${users.length} users`);
        
    } catch (error) {
        console.error('Failed to load users:', error);
        const tableContainer = document.getElementById('usersTable');
        if (tableContainer) {
            tableContainer.innerHTML = '<div class="error-state">Failed to load users. Please refresh.</div>';
        }
    }
}

function updateUserStats(users) {
    const statsContainer = document.getElementById('userStats');
    if (!statsContainer) return;
    
    const activeUsers = users.filter(u => u.is_active).length;
    const adminCount = users.filter(u => u.role === 'admin').length;
    const salesCount = users.filter(u => u.role === 'sales').length;
    const warehouseCount = users.filter(u => u.role === 'warehouse').length;
    const supplyCount = users.filter(u => u.role === 'supply').length;
    
    statsContainer.innerHTML = `
        <div class="stat-chip">Total: ${users.length}</div>
        <div class="stat-chip">Active: ${activeUsers}</div>
        <div class="stat-chip">👑 Admin: ${adminCount}</div>
        <div class="stat-chip">💰 Sales: ${salesCount}</div>
        <div class="stat-chip">📦 Warehouse: ${warehouseCount}</div>
        <div class="stat-chip">🚚 Supply: ${supplyCount}</div>
    `;
}

// ============================================
// OPEN USER MODAL
// ============================================
async function openUserModal(userId = null) {
    const modal = document.getElementById('userModal');
    const isEdit = userId !== null;
    
    document.getElementById('userForm').reset();
    document.getElementById('modalTitle').textContent = isEdit ? 'Edit User' : 'Add User';
    document.getElementById('userId').value = '';
    
    const passwordGroup = document.getElementById('passwordGroup');
    if (passwordGroup) passwordGroup.style.display = isEdit ? 'none' : 'block';
    
    // Hide role-specific fields initially
    const departmentGroup = document.getElementById('departmentGroup');
    const salesTargetGroup = document.getElementById('salesTargetGroup');
    const warehouseGroup = document.getElementById('warehouseGroup');
    const budgetGroup = document.getElementById('budgetGroup');
    
    if (departmentGroup) departmentGroup.style.display = 'none';
    if (salesTargetGroup) salesTargetGroup.style.display = 'none';
    if (warehouseGroup) warehouseGroup.style.display = 'none';
    if (budgetGroup) budgetGroup.style.display = 'none';
    
    if (isEdit) {
        try {
            const response = await apiCall(`/users/${userId}`);
            const user = response.data;
            
            document.getElementById('userId').value = user.id;
            document.getElementById('userName').value = user.name;
            document.getElementById('userEmail').value = user.email;
            document.getElementById('userRole').value = user.role;
            document.getElementById('userActive').checked = user.is_active;
            
            if (user.department) document.getElementById('userDepartment').value = user.department;
            if (user.sales_target) document.getElementById('userSalesTarget').value = user.sales_target;
            if (user.warehouse_id) document.getElementById('userWarehouseId').value = user.warehouse_id;
            if (user.purchase_budget) document.getElementById('userPurchaseBudget').value = user.purchase_budget;
            
            toggleRoleFields('userRole');
            
        } catch (error) {
            console.error('Failed to load user:', error);
            alert('Failed to load user data');
            return;
        }
    }
    
    modal.style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

// ============================================
// SAVE USER
// ============================================
async function saveUser() {
    const userId = document.getElementById('userId').value;
    const isEdit = userId !== '';
    
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const role = document.getElementById('userRole').value;
    
    if (!name) {
        alert('Name is required');
        return;
    }
    if (!email) {
        alert('Email is required');
        return;
    }
    if (!role) {
        alert('Role is required');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    const userData = {
        name: name,
        email: email,
        role: role,
        department: document.getElementById('userDepartment').value || null,
        is_active: document.getElementById('userActive')?.checked || true
    };
    
    // Role-specific fields
    if (role === 'sales') {
        userData.sales_target = parseFloat(document.getElementById('userSalesTarget').value) || null;
        userData.commission_rate = parseFloat(document.getElementById('userCommissionRate').value) || 5.0;
    }
    if (role === 'warehouse') {
        userData.warehouse_id = parseInt(document.getElementById('userWarehouseId').value) || null;
        userData.shift = document.getElementById('userShift').value || null;
    }
    if (role === 'supply') {
        userData.purchase_budget = parseFloat(document.getElementById('userPurchaseBudget').value) || null;
    }
    
    if (!isEdit) {
        const password = document.getElementById('userPassword').value;
        if (!password) {
            alert('Password is required for new users');
            return;
        }
        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }
        userData.password = password;
    }
    
    try {
        if (isEdit) {
            await apiCall(`/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(userData)
            });
            showToast('User updated successfully', 'success');
        } else {
            await apiCall('/users', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            showToast('User created successfully', 'success');
        }
        
        closeUserModal();
        await loadUsers();
        
    } catch (error) {
        console.error('Failed to save user:', error);
        alert(error.message || 'Failed to save user');
    }
}

// ============================================
// DELETE USER
// ============================================
async function deleteUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    const userName = user ? user.name : 'this user';
    
    if (user && user.role === 'admin') {
        const adminCount = allUsers.filter(u => u.role === 'admin').length;
        if (adminCount <= 1) {
            alert('Cannot delete the last admin user');
            return;
        }
    }
    
    if (!confirm(`Are you sure you want to delete user "${userName}"?`)) return;
    
    try {
        await apiCall(`/users/${userId}`, { method: 'DELETE' });
        showToast('User deleted successfully', 'success');
        await loadUsers();
    } catch (error) {
        alert(error.message || 'Failed to delete user');
    }
}

// ============================================
// RESET FILTERS
// ============================================
function resetFilters() {
    const searchInput = document.getElementById('userSearch');
    const statusFilter = document.getElementById('userStatusFilter');
    const sortSelect = document.getElementById('userSort');
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = 'all';
    if (sortSelect) sortSelect.value = 'name';
    
    loadUsers();
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    const applyFilterBtn = document.getElementById('applyFilter');
    const resetFilterBtn = document.getElementById('resetFilter');
    const searchInput = document.getElementById('userSearch');
    const statusFilter = document.getElementById('userStatusFilter');
    const sortSelect = document.getElementById('userSort');
    
    if (applyFilterBtn) applyFilterBtn.addEventListener('click', loadUsers);
    if (resetFilterBtn) resetFilterBtn.addEventListener('click', resetFilters);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadUsers();
        });
    }
    if (statusFilter) statusFilter.addEventListener('change', loadUsers);
    if (sortSelect) sortSelect.addEventListener('change', loadUsers);
}

// ============================================
// EXPORT GLOBALS
// ============================================
window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.saveUser = saveUser;
window.deleteUser = deleteUser;
window.resetFilters = resetFilters;

console.log('✅ Admin Users module loaded');