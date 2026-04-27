//console.log("admin screen");

const API_BASE = "http://localhost:3000";
let allUsers = [];

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Get filtered and sorted users based on search and filter inputs
function getFilteredUsers() {
    const search = document.getElementById("userSearch").value.toLowerCase().trim();
    const statusFilter = document.getElementById("userStatusFilter").value;
    const sort = document.getElementById("userSort").value;

    let list = allUsers.filter((user) => {
        const matchSearch = !search ||
            String(user.name ?? "").toLowerCase().includes(search) ||
            String(user.email ?? "").toLowerCase().includes(search) ||
            String(user.role ?? "").toLowerCase().includes(search);

        const matchStatus = statusFilter === "all" ||
            (statusFilter === "active" ? user.is_active : !user.is_active);

        return matchSearch && matchStatus;
    });

    list.sort((a, b) => {
        if (sort === "email") return String(a.email ?? "").localeCompare(String(b.email ?? ""));
        if (sort === "role") return String(a.role ?? "").localeCompare(String(b.role ?? ""));
        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    });

    return list;
}

function renderUsers() {
    const tbody = document.getElementById("userTableBody");
    if (!tbody) return;

    const users = getFilteredUsers();

    if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">No users found. Try adjusting your search or filters.</div></td></tr>`;
        return;
    }

    // Render user rows with proper escaping to prevent XSS
    tbody.innerHTML = users.map((u) => `
        <tr>
            <td>${escapeHtml(u.id ?? "")}</td>
            <td>${escapeHtml(u.name ?? "")}</td>
            <td>${escapeHtml(u.email ?? "")}</td>
            <td>${escapeHtml(u.role ?? "")}</td>
            <td>${u.is_active ? "Active" : "Inactive"}</td>
            <!-- row actions (edit/delete) -->
            <td>
                <div class="row-actions">
                    <button class="btn-edit"
                            data-id="${u.id}"
                            data-name="${escapeHtml(u.name ?? "") }"
                            data-email="${escapeHtml(u.email ?? "") }"
                            data-role="${escapeHtml(u.role ?? "") }"
                            data-department="${escapeHtml(u.department ?? "") }"
                            data-sales-target="${u.sales_target ?? ""}"
                            data-commission-rate="${u.commission_rate ?? ""}"
                            data-warehouse-id="${u.warehouse_id ?? ""}"
                            data-shift="${escapeHtml(u.shift ?? "") }"
                            data-purchase-budget="${u.purchase_budget ?? ""}"
                            data-status="${u.is_active ? "true" : "false"}">
                        Edit
                    </button>
                    <button class="btn-delete" data-id="${u.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");
}

// Load users and display in table
async function loadUsers() {
    const tbody = document.getElementById("userTableBody");
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/api/users`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        allUsers = Array.isArray(json.data) ? json.data : [];
        renderUsers();
    } catch (err) {
        console.error("Failed to load users:", err);    }
}

document.addEventListener("DOMContentLoaded", loadUsers);
document.addEventListener("DOMContentLoaded", () => {
    const toolbarInputs = ["userSearch", "userStatusFilter", "userSort"];
    toolbarInputs.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", renderUsers);
        if (el) el.addEventListener("change", renderUsers);
    });
});

// Add UserModal handling
const modal = document.getElementById("addUserModal");
const addUserBtn = document.getElementById("addUserBtn");
const closeModal = document.getElementById("closeModal");

// Open modal
if (addUserBtn && modal) {
    addUserBtn.addEventListener("click", () => {
        modal.style.display = "block";
    });
}

// Close modal
if (closeModal && modal) {
    closeModal.addEventListener("click", () => {
        modal.style.display = "none";
    });
}

window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

// Handle Add User form submission
document.getElementById("addUserForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = document.getElementById("role").value.trim().toLowerCase();
    const isActive = document.getElementById("status").value;
    const department = document.getElementById("department").value.trim();
    const salesTargetRaw = document.getElementById("salesTarget").value;
    const commissionRateRaw = document.getElementById("commissionRate").value;
    const warehouseIdRaw = document.getElementById("warehouseId").value;
    const shift = document.getElementById("shift").value.trim();
    const purchaseBudgetRaw = document.getElementById("purchaseBudget").value;
    const errorMsg = document.getElementById("formErrorMsg");

    // available roles
    const allowedRoles = ["admin", "sales", "warehouse", "supply"];


    // Clear error message before validation
    errorMsg.textContent = "";
    errorMsg.style.display = "none";

    // Basic validation -- will be enhanced later
    if (!name || !email || !password || !role) {
        // Show error message 
        errorMsg.textContent = "Please fill in all fields.";
        errorMsg.style.display = "block";
        return;
    }

    // Validate role selection
    if (!allowedRoles.includes(role)) {
        errorMsg.textContent = "Please select a valid role.";
        errorMsg.style.display = "block";
        return;
    }

    // validation passed — send to backend to create user
    try {
        const res = await fetch(`${API_BASE}/api/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                name,
                email,
                password,
                role,
                department,
                sales_target: salesTargetRaw === "" ? null : parseFloat(salesTargetRaw),
                commission_rate: commissionRateRaw === "" ? null : parseFloat(commissionRateRaw),
                warehouse_id: warehouseIdRaw === "" ? null : parseInt(warehouseIdRaw, 10),
                shift,
                purchase_budget: purchaseBudgetRaw === "" ? null : parseFloat(purchaseBudgetRaw),
                is_active: isActive
            })
        });

        if (!res.ok) {
            let msg = `Failed to add user. HTTP ${res.status}`;
            try {
                const errJson = await res.json();
                console.error("POST /api/users error JSON:", errJson);
                msg = errJson.message || errJson.error || msg;
            } catch {
                const errText = await res.text();
                console.error("POST /api/users error text:", errText);
            }
            errorMsg.textContent = msg;
            errorMsg.style.display = "block";
            return;
        }
        // Success — reload users, close modal, reset form
        await loadUsers();
        modal.style.display = "none";
        document.getElementById("addUserForm").reset();
    } catch (err) {
        console.error("Error adding user:", err);
        errorMsg.textContent = "An error occurred.";
        errorMsg.style.display = "block";
    }
    
}); 

// Edit/ Delete User info
const userTableBody = document.getElementById("userTableBody");
const editUserModal = document.getElementById("editUserModal");
const closeEditModal = document.getElementById("closeEditModal");
const editUserForm = document.getElementById("editUserForm");
const editFormErrorMsg = document.getElementById("editFormErrorMsg");

if (userTableBody) {
    userTableBody.addEventListener("click", async (e) => {
        const editBtn = e.target.closest(".btn-edit");
        const deleteBtn = e.target.closest(".btn-delete");

        // Open Edit User modal and populate fields
        if (editBtn) {
            document.getElementById("editUserId").value = editBtn.dataset.id;
            document.getElementById("editName").value = editBtn.dataset.name || "";
            document.getElementById("editEmail").value = editBtn.dataset.email || "";
            document.getElementById("editRole").value = (editBtn.dataset.role || "").toLowerCase();
            document.getElementById("editStatus").value = editBtn.dataset.status || "";
            document.getElementById("editDepartment").value = editBtn.dataset.department || "";
            document.getElementById("editSalesTarget").value = editBtn.dataset.salesTarget || "";
            document.getElementById("editCommissionRate").value = editBtn.dataset.commissionRate || "";
            document.getElementById("editWarehouseId").value = editBtn.dataset.warehouseId || "";
            document.getElementById("editShift").value = editBtn.dataset.shift || "";
            document.getElementById("editPurchaseBudget").value = editBtn.dataset.purchaseBudget || "";

            editFormErrorMsg.style.display = "none";
            editFormErrorMsg.textContent = "";
            editUserModal.style.display = "block";
            return;
        }

        // Ask for confirmation before deleting
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (!confirm("Delete this user?")) return;

            try {
                const res = await fetch(`${API_BASE}/api/users/${id}`, { method: "DELETE" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                await loadUsers();
                //log the deleted user ID for debugging
                console.log("User deleted with ID:", id);
            } catch (err) {
                console.error("Delete failed:", err);
                alert("Failed to delete user.");
            }
        }
    });
}

// Handle Edit User form submission
if (closeEditModal && editUserModal) {
    closeEditModal.addEventListener("click", () => {
        editUserModal.style.display = "none";
    });
}

if (editUserForm) {
    editUserForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = document.getElementById("editUserId").value;
        const name = document.getElementById("editName").value.trim();
        const email = document.getElementById("editEmail").value.trim();
        const role = document.getElementById("editRole").value.trim().toLowerCase();
        const isActive = document.getElementById("editStatus").value === "true";
        const department = document.getElementById("editDepartment").value.trim();
        const salesTargetRaw = document.getElementById("editSalesTarget").value;
        const commissionRateRaw = document.getElementById("editCommissionRate").value;
        const warehouseIdRaw = document.getElementById("editWarehouseId").value;
        const shift = document.getElementById("editShift").value.trim();
        const purchaseBudgetRaw = document.getElementById("editPurchaseBudget").value;

        // available roles
        const allowedRoles = ["admin", "sales", "warehouse", "supply"];

        editFormErrorMsg.style.display = "none";
        editFormErrorMsg.textContent = "";

        // Basic validation -- will be enhanced later
        if (!name || !email || !role) {
            // Show error message 
            editFormErrorMsg.textContent = "Please fill in all fields.";
            editFormErrorMsg.style.display = "block";
            return;
        }

        // Validate role selection
        if (!allowedRoles.includes(role)) {
            editFormErrorMsg.textContent = "Please select a valid role.";
            editFormErrorMsg.style.display = "block";
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/users/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    name,
                    email,
                    role,
                    department,
                    sales_target: salesTargetRaw === "" ? null : parseFloat(salesTargetRaw),
                    commission_rate: commissionRateRaw === "" ? null : parseFloat(commissionRateRaw),
                    warehouse_id: warehouseIdRaw === "" ? null : parseInt(warehouseIdRaw, 10),
                    shift,
                    purchase_budget: purchaseBudgetRaw === "" ? null : parseFloat(purchaseBudgetRaw),
                    is_active: isActive
                })
            });

             if (!res.ok) {
                const errJson = await res.json();
                editFormErrorMsg.textContent = errJson.message || errJson.error || "Failed to update user.";
                editFormErrorMsg.style.display = "block";
                return;
            }

            editUserModal.style.display = "none";
            await loadUsers();
        } catch (err) {
            console.error("Update failed:", err);
            editFormErrorMsg.textContent = "Failed to update user.";
            editFormErrorMsg.style.display = "block";
        }
    });
}