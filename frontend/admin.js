console.log("admin screen");

const API_BASE = "http://localhost:3000";

// Load users and display in table
async function loadUsers() {
    const tbody = document.getElementById("userTableBody");
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/api/users`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const users = Array.isArray(json.data) ? json.data : [];

        tbody.innerHTML = users.map((u) => `
            <tr>
                <td>${u.id ?? ""}</td>
                <td>${u.name ?? ""}</td>
                <td>${u.email ?? ""}</td>
                <td>${u.role ?? ""}</td>
                <!-- row actions (edit/delete) -->
                <td>
                    <div class="row-actions">
                            <button class="btn-edit"
                                    data-id="${u.id}"
                                    data-name="${u.name ?? ""}"
                                    data-email="${u.email ?? ""}"
                                    data-role="${u.role ?? ""}">
                                Edit
                            </button>
                            <button class="btn-delete" data-id="${u.id}">Delete</button>
                        </div>
                </td>
            </tr>
        `).join("");

        if (!users.length) {
            tbody.innerHTML = `<tr><td colspan="4">No users found.</td></tr>`;
        }
    } catch (err) {
        console.error("Failed to load users:", err);    }
}

document.addEventListener("DOMContentLoaded", loadUsers);

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
            body: JSON.stringify({ name, email, password, role })
        });

        /*
        if (!res.ok) {
            const err = await res.json();
            errorMsg.textContent = err.message || "Failed to add user.";
            errorMsg.style.display = "block";
            return;
        }
        */

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