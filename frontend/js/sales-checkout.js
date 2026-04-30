// Sales Checkout JavaScript (for sales/dashboard.html)

document.addEventListener('DOMContentLoaded', function() {
    const deliveryType = document.getElementById('deliveryType');
    const addressGroup = document.getElementById('addressGroup');
    
    if (deliveryType && addressGroup) {
        deliveryType.addEventListener('change', function() {
            addressGroup.style.display = this.value === 'delivery' ? 'block' : 'none';
        });
    }
});