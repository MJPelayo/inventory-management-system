const API_BASE = "http://localhost:3000";
let allSuppliers = [];

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getFilteredSuppliers() {
    const search = document.getElementById("supplierSearch").value.toLowerCase().trim();
    const statusFilter = document.getElementById("supplierStatusFilter").value;
    const sort = document.getElementById("supplierSort").value;

    let list = allSuppliers.filter((supplier) => {
        const matchSearch = !search ||
            String(supplier.name ?? "").toLowerCase().includes(search) ||
            String(supplier.contact_person ?? "").toLowerCase().includes(search) ||
            String(supplier.email ?? "").toLowerCase().includes(search) ||
            String(supplier.payment_terms ?? "").toLowerCase().includes(search);

        const matchStatus = statusFilter === "all" ||
            (statusFilter === "active" ? supplier.is_active : !supplier.is_active);

        return matchSearch && matchStatus;
    });

    list.sort((a, b) => {
        if (sort === "payment_terms") {
            return String(a.payment_terms ?? "").localeCompare(String(b.payment_terms ?? ""));
        }
        if (sort === "rating-desc") {
            return Number(b.rating ?? 0) - Number(a.rating ?? 0);
        }
        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    });

    return list;
}

function renderSuppliers() {
    const tbody = document.getElementById("supplierTableBody");
    if (!tbody) return;

    const suppliers = getFilteredSuppliers();

    if (!suppliers.length) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">No suppliers found. Try adjusting your search or filters.</div></td></tr>`;
        return;
    }

    tbody.innerHTML = suppliers.map((s) => `
        <tr>
            <td>${escapeHtml(s.id ?? "")}</td>
            <td>${escapeHtml(s.name ?? "")}</td>
            <td>${escapeHtml(s.contact_person ?? "")}</td>
            <td>${escapeHtml(s.phone ?? "")}</td>
            <td>${escapeHtml(s.email ?? "")}</td>
            <td>${s.is_active ? "Active" : "Inactive"}</td>
            <td>${escapeHtml(s.payment_terms ?? "")}</td>
            <td>
                <div class="row-actions">
                    <button class="btn-edit"
                            data-id="${s.id}"
                            data-name="${escapeHtml(s.name ?? "") }"
                            data-contact-person="${escapeHtml(s.contact_person ?? "") }"
                            data-phone="${escapeHtml(s.phone ?? "") }"
                            data-email="${escapeHtml(s.email ?? "") }"
                            data-address="${escapeHtml(s.address ?? "") }"
                            data-tax-id="${escapeHtml(s.tax_id ?? "") }"
                            data-is-active="${s.is_active ? "true" : "false"}"
                            data-payment-terms="${escapeHtml(s.payment_terms ?? "") }"
                            data-min-order="${s.minimum_order ?? ""}"
                            data-total-orders="${s.total_orders ?? ""}"
                            data-lead-time-days="${s.lead_time_days ?? ""}"
                            data-on-time-deliveries="${s.on_time_deliveries ?? ""}"
                            data-rating="${s.rating ?? ""}">
                        Edit
                    </button>
                    <button class="btn-delete" data-id="${s.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");
}

// Load suppliers and display in table
async function loadSuppliers() {
    const tbody = document.getElementById("supplierTableBody");
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/api/suppliers`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        allSuppliers = Array.isArray(json.data) ? json.data : [];
        renderSuppliers();
    } catch (err) {
        console.error("Failed to load suppliers:", err);
    }
}

document.addEventListener("DOMContentLoaded", loadSuppliers);
document.addEventListener("DOMContentLoaded", () => {
    const toolbarInputs = ["supplierSearch", "supplierStatusFilter", "supplierSort"];
    toolbarInputs.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", renderSuppliers);
        if (el) el.addEventListener("change", renderSuppliers);
    });
});

// Add SupplierModal handling
const modal = document.getElementById("addSupplierModal");
const addSupplierBtn = document.getElementById("addSupplierBtn");
const closeModal = document.getElementById("closeModal");

// Open modal
if (addSupplierBtn && modal) {
    addSupplierBtn.addEventListener("click", () => {
        // Clear form and error message when opening modal
        document.getElementById("addSupplierForm").reset();
        const errorMsg = document.getElementById("formErrorMsg");
        errorMsg.textContent = "";
        errorMsg.style.display = "none";

        // add class "show-modal" to show modal
        modal.classList.add("show-modal");
    });
}

// Close modal
if (closeModal && modal) {
    closeModal.addEventListener("click", () => {
        modal.classList.remove("show-modal");
    });
}

window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.classList.remove("show-modal");
    }
});

// Handle Add Supplier form submission
document.getElementById("addSupplierForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();
    const taxId = document.getElementById("taxId").value.trim();
    const paymentTerms = document.getElementById("paymentTerms").value.trim();
    const errorMsg = document.getElementById("formErrorMsg");
    const contactPerson = document.getElementById("contact").value.trim();
    const leadTime = document.getElementById("leadTime").value.trim();
    const minOrder = document.getElementById("minOrder").value.trim();
    const totalOrder = document.getElementById("totalOrder").value.trim();
    const onTimeDelivery = document.getElementById("onTimeDelivery").value.trim();
    const qualityRating = document.getElementById("qualityRating").value.trim();
    const status = document.getElementById("status").value.trim();

    // available roles

    // Clear error message before validation
    errorMsg.textContent = "";
    errorMsg.style.display = "none";

    // Basic validation -- will be enhanced later
    if (!name || !email || !phone || !contactPerson || !paymentTerms) {
        // Show error message 
        errorMsg.textContent = "Please fill in all fields.";
        errorMsg.style.display = "block";
        return;
    }

    // validation passed — send to backend to create supplier
    try {
        const res = await fetch(`${API_BASE}/api/suppliers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                name, email, phone, contact_person: contactPerson, 
                address, tax_id: taxId, payment_terms: paymentTerms, 
                lead_time_days: leadTime === "" ? 7 : Number(leadTime),
                minimum_order: minOrder === "" ? 0 : Number(minOrder),
                total_orders: totalOrder === "" ? 0 : Number(totalOrder),
                on_time_deliveries: onTimeDelivery === "" ? 0 : Number(onTimeDelivery),
                rating: qualityRating === "" ? 0 : Number(qualityRating),
                is_active: status === "true"
            })
        });

        if (!res.ok) {
            let msg = `Failed to add supplier. HTTP ${res.status}`;
            try {
                const errJson = await res.json();
                console.error("POST /api/suppliers error JSON:", errJson);
                msg = errJson.message || errJson.error || msg;
            } catch {
                const errText = await res.text();
                console.error("POST /api/suppliers error text:", errText);
            }
            errorMsg.textContent = msg;
            errorMsg.style.display = "block";
            return;
        }
        // Success — reload suppliers, close modal, reset form
        await loadSuppliers();
        modal.classList.remove("show-modal");
        document.getElementById("addSupplierForm").reset();
    } catch (err) {
        console.error("Error adding supplier:", err);
        errorMsg.textContent = "An error occurred.";
        errorMsg.style.display = "block";
    }
    
}); 

// Edit/ Delete User info
const userTableBody = document.getElementById("supplierTableBody");
const editUserModal = document.getElementById("editSupplierModal");
const closeEditModal = document.getElementById("closeEditModal");
const editUserForm = document.getElementById("editSupplierForm");
const editFormErrorMsg = document.getElementById("editFormErrorMsg");

if (userTableBody) {
    userTableBody.addEventListener("click", async (e) => {
        const editBtn = e.target.closest(".btn-edit");
        const deleteBtn = e.target.closest(".btn-delete");

        // Open Edit User modal and populate fields
        if (editBtn) {
            document.getElementById("editSupplierId").value = editBtn.dataset.id;
            document.getElementById("editName").value = editBtn.dataset.name || "";
            document.getElementById("editEmail").value = editBtn.dataset.email || "";
            document.getElementById("editContact").value = editBtn.dataset.contactPerson || "";
            document.getElementById("editPhone").value = editBtn.dataset.phone || "";
            document.getElementById("editAddress").value = editBtn.dataset.address || "";
            document.getElementById("editTaxId").value = editBtn.dataset.taxId || "";
            document.getElementById("editPaymentTerms").value = editBtn.dataset.paymentTerms || "";
            document.getElementById("editMinOrder").value = editBtn.dataset.minOrder || "";
            document.getElementById("editTotalOrder").value = editBtn.dataset.totalOrders || "";
            document.getElementById("editStatus").value = editBtn.dataset.isActive || "";
            document.getElementById("editLeadTime").value = editBtn.dataset.leadTimeDays || "";
            document.getElementById("editOnTimeDelivery").value = editBtn.dataset.onTimeDeliveries || "";
            document.getElementById("editQualityRating").value = editBtn.dataset.rating || "";
            editFormErrorMsg.style.display = "none";
            editFormErrorMsg.textContent = "";
            editUserModal.classList.add("show-modal");
            return;
        }

        // Ask for confirmation before deleting
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (!confirm("Delete this supplier?")) return;

            try {
                const res = await fetch(`${API_BASE}/api/suppliers/${id}`, { method: "DELETE" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                await loadSuppliers();
            } catch (err) {
                console.error("Delete failed:", err);
                alert("Failed to delete supplier.");
            }
        }
    });
}

// Handle Edit Supplier form submission
if (closeEditModal && editUserModal) {
    closeEditModal.addEventListener("click", () => {
        editUserModal.classList.remove("show-modal");
    });
}

if (editUserForm) {
    editUserForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = document.getElementById("editSupplierId").value;
        const name = document.getElementById("editName").value.trim();
        const email = document.getElementById("editEmail").value.trim();
        const contactPerson = document.getElementById("editContact").value.trim();
        const phone = document.getElementById("editPhone").value.trim();
        const address = document.getElementById("editAddress").value.trim();
        const taxId = document.getElementById("editTaxId").value.trim();
        const paymentTerms = document.getElementById("editPaymentTerms").value.trim();
        const minOrder = document.getElementById("editMinOrder").value.trim();
        const totalOrder = document.getElementById("editTotalOrder").value.trim();
        const status = document.getElementById("editStatus").value.trim();
        const leadTime = document.getElementById("editLeadTime").value.trim();
        const onTimeDelivery = document.getElementById("editOnTimeDelivery").value.trim();
        const qualityRating = document.getElementById("editQualityRating").value.trim();

        editFormErrorMsg.style.display = "none";
        editFormErrorMsg.textContent = "";

        try {
            const res = await fetch(`${API_BASE}/api/suppliers/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    name,
                    email,
                    contact_person: contactPerson,
                    phone,
                    address,
                    tax_id: taxId,
                    payment_terms: paymentTerms,
                    minimum_order: minOrder === "" ? 0 : Number(minOrder),
                    total_orders: totalOrder === "" ? 0 : Number(totalOrder),
                    is_active: status === "true",
                    lead_time_days: leadTime === "" ? 7 : Number(leadTime),
                    on_time_deliveries: onTimeDelivery === "" ? 0 : Number(onTimeDelivery),
                    rating: qualityRating === "" ? 0 : Number(qualityRating)
                })
            });

             if (!res.ok) {
                const errJson = await res.json();
                editFormErrorMsg.textContent = errJson.message || errJson.error || "Failed to update supplier.";
                editFormErrorMsg.style.display = "block";
                return;
            }

            editUserModal.classList.remove("show-modal");
            await loadSuppliers();
        } catch (err) {
            console.error("Update failed:", err);
            editFormErrorMsg.textContent = "Failed to update supplier.";
            editFormErrorMsg.style.display = "block";
        }
    });
}

window.addEventListener("click", (e) => {
    if (e.target === editUserModal) {
        editUserModal.classList.remove("show-modal");
    }
});


