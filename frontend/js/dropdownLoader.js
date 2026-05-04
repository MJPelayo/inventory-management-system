/**
 * Global Dropdown Loader
 * Fetches all dropdown values from database and populates selects
 * 
 * @module dropdownLoader
 */

class DropdownLoader {
    constructor() {
        this.data = {
            payment_terms: [],
            delivery_types: [],
            order_statuses: [],
            payment_statuses: [],
            user_roles: [],
            shipping_methods: []
        };
        this.isLoaded = false;
    }

    async loadAll() {
        if (this.isLoaded) return this.data;
        
        try {
            const response = await apiCall('/dropdowns/all');
            this.data = response.data;
            this.isLoaded = true;
            console.log('✅ All dropdowns loaded from database');
            return this.data;
        } catch (error) {
            console.error('Failed to load dropdowns:', error);
            return this.data;
        }
    }

    async populateSelect(selectElementId, dataKey, valueField = 'id', labelField = null) {
        const select = document.getElementById(selectElementId);
        if (!select) return;

        const items = this.data[dataKey] || [];
        
        if (labelField === null) {
            // Auto-detect label field
            if (items.length > 0) {
                const firstItem = items[0];
                labelField = firstItem.term_name ? 'term_name' :
                           firstItem.type_name ? 'type_name' :
                           firstItem.status_name ? 'status_name' :
                           firstItem.role_name ? 'role_name' :
                           firstItem.method_name ? 'method_name' : 'name';
            }
        }

        // Preserve first option if it's a placeholder
        const firstOption = select.options[0];
        select.innerHTML = '';
        
        if (firstOption && firstOption.value === '') {
            select.appendChild(firstOption);
        } else {
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = `Select ${dataKey.replace('_', ' ')}`;
            select.appendChild(placeholder);
        }

        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueField];
            const label = labelField ? item[labelField] : item.term_name || item.type_name || item.status_name || item.role_name || item.method_name;
            option.textContent = label;
            select.appendChild(option);
        });
    }

    async populateSelectDirect(selectElement, items, valueField = 'id', labelField = null) {
        if (!selectElement) return;
        
        const firstOption = selectElement.options[0];
        selectElement.innerHTML = '';
        
        if (firstOption && firstOption.value === '') {
            selectElement.appendChild(firstOption);
        }

        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueField];
            const label = labelField ? item[labelField] : item.name || item.term_name || item.type_name;
            option.textContent = label;
            selectElement.appendChild(option);
        });
    }

    getPaymentTermName(id) {
        const term = this.data.payment_terms.find(t => t.id === id);
        return term ? term.term_name : '';
    }

    getDeliveryTypeName(id) {
        const type = this.data.delivery_types.find(t => t.id === id);
        return type ? type.type_name : '';
    }

    getOrderStatusName(id) {
        const status = this.data.order_statuses.find(s => s.id === id);
        return status ? status.status_name : '';
    }

    getPaymentStatusName(id) {
        const status = this.data.payment_statuses.find(s => s.id === id);
        return status ? status.status_name : '';
    }

    getUserRoleName(id) {
        const role = this.data.user_roles.find(r => r.id === id);
        return role ? role.role_name : '';
    }
}

// Create global instance
const dropdownLoader = new DropdownLoader();

// Initialize when auth is ready
document.addEventListener('DOMContentLoaded', async () => {
    if (auth.isLoggedIn()) {
        await dropdownLoader.loadAll();
    }
});