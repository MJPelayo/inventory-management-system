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
            </tr>
        `).join("");

        if (!users.length) {
            tbody.innerHTML = `<tr><td colspan="4">No users found.</td></tr>`;
        }
    } catch (err) {
        console.error("Failed to load users:", err);
        tbody.innerHTML = `<tr><td colspan="4">Failed to load users.</td></tr>`;
    }
}

document.addEventListener("DOMContentLoaded", loadUsers);

// Modal handling
const modal = document.getElementById("addUserModal");
const addUserBtn = document.getElementById("addUserBtn");
const closeModal = document.getElementById("closeModal");

// Open modal
addUserBtn.addEventListener("click", () => {
    modal.style.display = "block";
});

// Close modal
closeModal.addEventListener("click", () => {
    modal.style.display = "none";
});

window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});


