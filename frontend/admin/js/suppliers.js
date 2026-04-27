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



