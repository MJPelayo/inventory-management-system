// frontend/js/admin-categories.js


// ============================================
// GLOBAL VARIABLES
// ============================================
let currentCategoryId = null;
let allCategories = [];

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin Categories page loading...');
    
    // Check authentication and role
    if (!auth.isLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }
    
    if (!auth.hasRole('admin')) {
        alert('Access denied. Admin privileges required.');
        auth.logout();
        return;
    }
    
    // Initialize header and sidebar
    new Header('appHeader');
    new Sidebar('sidebar', 'categories');
    
    // Load categories
    await loadCategories();
    
    // Setup form reset
    document.getElementById('cancelCategoryBtn').addEventListener('click', resetCategoryForm);
});

// ============================================
// LOAD CATEGORIES AND BUILD TREE VIEW
// ============================================
async function loadCategories() {
    try {
        console.log('Loading categories...');
        
        // Get flat list for dropdowns
        const flatRes = await apiCall('/categories');
        allCategories = flatRes.data || [];
        
        // Get tree structure for display
        const treeRes = await apiCall('/categories/tree');
        const categoryTree = treeRes.data || [];
        
        // Build tree HTML
        const treeContainer = document.getElementById('categoryTree');
        if (treeContainer) {
            treeContainer.innerHTML = buildTreeHTML(categoryTree);
        }
        
        // Populate parent category dropdowns
        populateParentDropdowns(allCategories);
        
        // Update stats
        const statsContainer = document.getElementById('categoryStats');
        if (statsContainer) {
            const rootCategories = allCategories.filter(c => !c.parent_id);
            statsContainer.innerHTML = `
                <div class="stat-chip">Total Categories: ${allCategories.length}</div>
                <div class="stat-chip">Root Categories: ${rootCategories.length}</div>
            `;
        }
        
        console.log(`Loaded ${allCategories.length} categories`);
        
    } catch (error) {
        console.error('Failed to load categories:', error);
        const treeContainer = document.getElementById('categoryTree');
        if (treeContainer) {
            treeContainer.innerHTML = '<div class="error-state">Failed to load categories. Please refresh.</div>';
        }
    }
}

// ============================================
// BUILD TREE HTML RECURSIVELY
// ============================================
function buildTreeHTML(categories, level = 0) {
    if (!categories || categories.length === 0) {
        if (level === 0) return '<div class="empty-state">No categories found. Create your first category!</div>';
        return '';
    }
    
    let html = '<ul class="category-tree">';
    
    for (const cat of categories) {
        const hasChildren = cat.children && cat.children.length > 0;
        const indent = level * 20;
        
        html += `
            <li class="category-node" data-id="${cat.id}" style="margin-left: ${indent}px;">
                <div class="category-item">
                    <div class="category-info">
                        <span class="category-expand ${hasChildren ? 'has-children' : ''}" onclick="toggleCategoryChildren(${cat.id})">
                            ${hasChildren ? '▼' : '•'}
                        </span>
                        <span class="category-name">${escapeHtml(cat.name)}</span>
                        ${cat.description ? `<span class="category-desc">- ${escapeHtml(cat.description)}</span>` : ''}
                    </div>
                    <div class="category-actions">
                        <button class="btn-icon" onclick="editCategory(${cat.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="deleteCategory(${cat.id})" title="Delete">🗑️</button>
                    </div>
                </div>
                ${hasChildren ? `<div id="children-${cat.id}" class="category-children">${buildTreeHTML(cat.children, level + 1)}</div>` : ''}
            </li>
        `;
    }
    
    html += '</ul>';
    return html;
}

// ============================================
// TOGGLE CATEGORY CHILDREN VISIBILITY
// ============================================
function toggleCategoryChildren(categoryId) {
    const childrenContainer = document.getElementById(`children-${categoryId}`);
    const expandIcon = document.querySelector(`.category-node[data-id="${categoryId}"] .category-expand`);
    
    if (childrenContainer) {
        if (childrenContainer.style.display === 'none') {
            childrenContainer.style.display = 'block';
            expandIcon.textContent = '▼';
        } else {
            childrenContainer.style.display = 'none';
            expandIcon.textContent = '▶';
        }
    }
}

// ============================================
// POPULATE PARENT CATEGORY DROPDOWNS
// ============================================
function populateParentDropdowns(categories) {
    const parentSelect = document.getElementById('categoryParent');
    if (!parentSelect) return;
    
    // Build hierarchical options
    const buildOptions = (cats, prefix = '', level = 0) => {
        let html = '';
        for (const cat of cats) {
            if (!cat.parent_id) {
                html += `<option value="${cat.id}">${prefix}${escapeHtml(cat.name)}</option>`;
                // Add children recursively
                const children = cats.filter(c => c.parent_id === cat.id);
                html += buildOptions(children, prefix + '  └ ', level + 1);
            }
        }
        return html;
    };
    
    const options = buildOptions(categories);
    parentSelect.innerHTML = '<option value="">None (Root Category)</option>' + options;
}

// ============================================
// OPEN ADD CATEGORY MODAL
// ============================================
function openAddCategoryModal() {
    currentCategoryId = null;
    resetCategoryForm();
    document.getElementById('modalTitle').textContent = 'Add Category';
    document.getElementById('categoryModal').style.display = 'flex';
}

// ============================================
// EDIT CATEGORY
// ============================================
async function editCategory(categoryId) {
    try {
        const response = await apiCall(`/categories/${categoryId}`);
        const category = response.data;
        
        currentCategoryId = category.id;
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categoryDescription').value = category.description || '';
        document.getElementById('categoryParent').value = category.parent_id || '';
        
        document.getElementById('modalTitle').textContent = 'Edit Category';
        document.getElementById('categoryModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Failed to load category:', error);
        alert('Failed to load category data');
    }
}

// ============================================
// CLOSE CATEGORY MODAL
// ============================================
function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
    resetCategoryForm();
}

// ============================================
// RESET CATEGORY FORM
// ============================================
function resetCategoryForm() {
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryDescription').value = '';
    document.getElementById('categoryParent').value = '';
    currentCategoryId = null;
}

// ============================================
// SAVE CATEGORY (Create or Update)
// ============================================
async function saveCategory() {
    const name = document.getElementById('categoryName').value.trim();
    const description = document.getElementById('categoryDescription').value.trim() || null;
    const parentId = document.getElementById('categoryParent').value;
    
    // Validate
    if (!name) {
        alert('Category name is required');
        return;
    }
    
    if (name.length < 2) {
        alert('Category name must be at least 2 characters');
        return;
    }
    
    // Check for circular reference
    if (parentId && parseInt(parentId) === currentCategoryId) {
        alert('A category cannot be its own parent');
        return;
    }
    
    const categoryData = {
        name: name,
        description: description,
        parent_id: parentId ? parseInt(parentId) : null
    };
    
    try {
        let response;
        if (currentCategoryId) {
            // Update existing category
            response = await apiCall(`/categories/${currentCategoryId}`, {
                method: 'PUT',
                body: JSON.stringify(categoryData)
            });
            showToast('Category updated successfully', 'success');
        } else {
            // Create new category
            response = await apiCall('/categories', {
                method: 'POST',
                body: JSON.stringify(categoryData)
            });
            showToast('Category created successfully', 'success');
        }
        
        closeCategoryModal();
        await loadCategories();
        
    } catch (error) {
        console.error('Failed to save category:', error);
        alert(error.message || 'Failed to save category');
    }
}

// ============================================
// DELETE CATEGORY
// ============================================
async function deleteCategory(categoryId) {
    // Get category name for confirmation
    const category = allCategories.find(c => c.id === categoryId);
    const categoryName = category ? category.name : 'this category';
    
    // Check if category has children
    const hasChildren = allCategories.some(c => c.parent_id === categoryId);
    
    let message = `Are you sure you want to delete category "${categoryName}"?`;
    if (hasChildren) {
        message = `Cannot delete "${categoryName}" because it has subcategories. Please delete or reassign child categories first.`;
        alert(message);
        return;
    }
    
    if (!confirm(message)) {
        return;
    }
    
    try {
        await apiCall(`/categories/${categoryId}`, { method: 'DELETE' });
        showToast('Category deleted successfully', 'success');
        await loadCategories();
        
    } catch (error) {
        console.error('Failed to delete category:', error);
        
        // Check if error is about products
        if (error.message.includes('products')) {
            alert('Cannot delete category that has products assigned to it. Please reassign products first.');
        } else {
            alert(error.message || 'Failed to delete category');
        }
    }
}

// ============================================
// VIEW CATEGORY DETAILS
// ============================================
async function viewCategoryDetails(categoryId) {
    try {
        const response = await apiCall(`/categories/${categoryId}`);
        const category = response.data;
        
        // Get full path
        let path = category.name;
        let currentParent = allCategories.find(c => c.id === category.parent_id);
        while (currentParent) {
            path = currentParent.name + ' > ' + path;
            currentParent = allCategories.find(c => c.id === currentParent.parent_id);
        }
        
        // Count products in this category
        const productsRes = await apiCall(`/products?category_id=${categoryId}`);
        const productCount = productsRes.data?.length || 0;
        
        const modalHtml = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Category Details</h2>
                    <button class="close-btn" onclick="closeViewModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="details-grid">
                        <div><strong>Name:</strong> ${escapeHtml(category.name)}</div>
                        <div><strong>Path:</strong> ${escapeHtml(path)}</div>
                        <div><strong>Products:</strong> ${productCount}</div>
                        <div><strong>Created:</strong> ${new Date(category.created_at).toLocaleDateString()}</div>
                    </div>
                    ${category.description ? `<div><strong>Description:</strong><br>${escapeHtml(category.description)}</div>` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="closeViewModal()">Close</button>
                    <button class="btn btn-primary" onclick="closeViewModal(); editCategory(${category.id})">Edit Category</button>
                </div>
            </div>
        `;
        
        // Create and show modal
        const modal = document.createElement('div');
        modal.id = 'viewModal';
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Failed to load category details:', error);
        alert('Failed to load category details');
    }
}

// ============================================
// CLOSE VIEW MODAL
// ============================================
function closeViewModal() {
    const modal = document.getElementById('viewModal');
    if (modal) modal.remove();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ============================================
window.openAddCategoryModal = openAddCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.saveCategory = saveCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.viewCategoryDetails = viewCategoryDetails;
window.toggleCategoryChildren = toggleCategoryChildren;
window.closeViewModal = closeViewModal;

console.log('✅ Admin Categories module loaded');