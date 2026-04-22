console.log("suppliers screen");

const API_BASE = "http://localhost:3000";

// Load suppliers and display in table
async function loadSuppliers() {
    const tbody = document.getElementById("supplierTableBody");
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/api/suppliers`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const suppliers = Array.isArray(json.data) ? json.data : [];

        tbody.innerHTML = suppliers.map((s) => `
            <tr>
                <td>${s.id ?? ""}</td>
                <td>${s.name ?? ""}</td>
                <td>${s.contact_person ?? ""}</td>
                <td>${s.phone ?? ""}</td>
                <td>${s.email ?? ""}</td>
                <td>${s.is_active ? "Active" : "Inactive"}</td>
                <td>${s.payment_terms ?? ""}</td>
                <!-- row actions (edit/delete) -->
                <td>
                    <div class="row-actions">
                            <button class="btn-edit"
                                    data-id="${s.id}"
                                    data-name="${s.name ?? ""}"
                                    data-contact-person="${s.contact_person ?? ""}"
                                    data-phone="${s.phone ?? ""}"
                                    data-email="${s.email ?? ""}"
                                    data-is-active="${s.is_active ?? ""}"
                                    data-payment-terms="${s.payment_terms ?? ""}">
                                Edit
                            </button>
                            <button class="btn-delete" data-id="${s.id}">Delete</button>
                        </div>
                </td>
            </tr>
        `).join("");

        if (!suppliers.length) {
            tbody.innerHTML = `<tr><td colspan="8">No suppliers found.</td></tr>`;
        }
    } catch (err) {
        console.error("Failed to load suppliers:", err);
    }
}

document.addEventListener("DOMContentLoaded", loadSuppliers);
