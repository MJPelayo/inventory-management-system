// frontend/js/admin-users.js
/**
 * Admin User Management
 * Handles CRUD operations for users
 * 
 * @module admin-users
 */

let usersTable = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!auth.isLoggedIn() || !auth.hasRole('admin')) {
        window.location.href = '/index.html';
        return;
    }
    
    new Header('appHeader');
    new Sidebar('sidebar', 'users');
    
    await loadUsers();
    
    // Show/hide role-specific fields
    document.getElementById('userRole').addEventListener('change', toggleRoleFields);
});

async function loadUsers() {
    try {
        const response = await apiCall('/users');
        const users = response.data || [];
        
        const columns = [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'is_active', label: 'Status' }
        ];
        
        const formattedUsers = users.map(u => ({
            ...u,
            is_active: u.is_active ? '✓ Active' : '✗ Inactive'
        }));
        
        usersTable = new DataTable('usersTable', columns, {
            itemsPerPage: 10,
            searchable: true,
            sortable: true,
            onEdit: (id) => openUserModal(id),
            onDelete: (id) => deleteUser(id)
        });
        
        usersTable.setData(formattedUsers);
        
    } catch (error) {
        console.error('Failed to load users:', error);
        document.getElementById('usersTable').innerHTML = '<div class="error-state">Failed to load users</div>';
    }
}

function toggleRoleFields() {
    const role = document.getElementById('userRole').value;
    
    document.getElementById('departmentGroup').style.display = role ? 'block' : 'none';
    document.getElementById('salesTargetGroup').style.display = role === 'sales' ? 'block' : 'none';
    document.getElementById('warehouseGroup').style.display = role === 'warehouse' ? 'block' : 'none';
    document.getElementById('budgetGroup').style.display = role === 'supply' ? 'block' : 'none';
}

async function openUserModal(userId = null) {
    const modal = document.getElementById('userModal');
    const isEdit = userId !== null;
    
    document.getElementById('modalTitle').textContent = isEdit ? 'Edit User' : 'Add User';
    document.getElementById('passwordGroup').style.display = isEdit ? 'none' : 'block';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    
    if (isEdit) {
        try {
            const response = await apiCall(`/users/${userId}`);
            const user = response.data;
            
            document.getElementById('userId').value = user.id;
            document.getElementById('userName').value = user.name;
            document.getElementById('userEmail').value = user.email;
            document.getElementById('userRole').value = user.role;
            
            toggleRoleFields();
            
            if (user.department) document.getElementById('userDepartment').value = user.department;
            if (user.sales_target) document.getElementById('userSalesTarget').value = user.sales_target;
            if (user.warehouse_id) document.getElementById('userWarehouseId').value = user.warehouse_id;
            if (user.purchase_budget) document.getElementById('userPurchaseBudget').value = user.purchase_budget;
            
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

async function saveUser() {
    const userId = document.getElementById('userId').value;
    const isEdit = userId !== '';
    
    const userData = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        role: document.getElementById('userRole').value,
        department: document.getElementById('userDepartment').value || null,
        sales_target: parseFloat(document.getElementById('userSalesTarget').value) || null,
        warehouse_id: parseInt(document.getElementById('userWarehouseId').value) || null,
        purchase_budget: parseFloat(document.getElementById('userPurchaseBudget').value) || null
    };
    
    if (!isEdit) {
        const password = document.getElementById('userPassword').value;
        if (!password) {
            alert('Password is required for new users');
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
        } else {
            await apiCall('/users', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        }
        
        closeUserModal();
        await loadUsers();
        alert(isEdit ? 'User updated successfully' : 'User created successfully');
        
    } catch (error) {
        console.error('Failed to save user:', error);
        alert(error.message || 'Failed to save user');
    }
}

async function deleteUser(userId) {
    try {
        await apiCall(`/users/${userId}`, { method: 'DELETE' });
        await loadUsers();
        alert('User deleted successfully');
    } catch (error) {
        console.error('Failed to delete user:', error);
        alert(error.message || 'Failed to delete user');
    }
}