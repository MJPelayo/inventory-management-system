// backend/typescript-demo/SalesOrder.ts
// TypeScript version of SalesOrder model for demonstration

export interface OrderItem {
    product_id: number;
    quantity: number;
    unit_price: number;
    discount?: number;
}

export interface SalesOrderData {
    id?: number;
    order_number?: string;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    shipping_address?: string;
    delivery_type: 'delivery' | 'pickup';
    status?: 'pending' | 'processing' | 'ready' | 'in_transit' | 'delivered' | 'cancelled';
    payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
    items: OrderItem[];
    discount_amount?: number;
    discount_approved_by?: number;
    shipping_cost?: number;
    created_by: number;
}

export class SalesOrder {
    private id: number | null;
    private order_number: string;
    private customer_name: string;
    private customer_email: string | null;
    private customer_phone: string | null;
    private shipping_address: string | null;
    private delivery_type: string;
    private status: string;
    private payment_status: string;
    private subtotal: number;
    private discount_amount: number;
    private discount_approved_by: number | null;
    private tax: number;
    private shipping_cost: number;
    private total_amount: number;
    private created_by: number;
    private items: OrderItem[];
    private created_at: Date | null;
    private updated_at: Date | null;

    constructor(data: SalesOrderData) {
        this.id = data.id || null;
        this.order_number = data.order_number || this.generateOrderNumber();
        this.customer_name = data.customer_name;
        this.customer_email = data.customer_email || null;
        this.customer_phone = data.customer_phone || null;
        this.shipping_address = data.shipping_address || null;
        this.delivery_type = data.delivery_type;
        this.status = data.status || 'pending';
        this.payment_status = data.payment_status || 'pending';
        this.subtotal = 0;
        this.discount_amount = data.discount_amount || 0;
        this.discount_approved_by = data.discount_approved_by || null;
        this.tax = 0;
        this.shipping_cost = data.shipping_cost || 0;
        this.total_amount = 0;
        this.created_by = data.created_by;
        this.items = data.items || [];
        this.created_at = null;
        this.updated_at = null;
    }

    private generateOrderNumber(): string {
        return `SO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    calculateSubtotal(): number {
        this.subtotal = this.items.reduce((sum, item) => {
            const itemTotal = item.quantity * item.unit_price;
            const discount = item.discount || 0;
            return sum + (itemTotal * (1 - discount / 100));
        }, 0);
        return this.subtotal;
    }

    calculateTotal(): number {
        this.calculateSubtotal();
        this.total_amount = this.subtotal - this.discount_amount + this.shipping_cost + this.tax;
        return this.total_amount;
    }

    applyDiscount(amount: number, approvedBy: number): void {
        if (amount < 0) throw new Error('Discount cannot be negative');
        if (amount > this.subtotal) throw new Error('Discount cannot exceed subtotal');
        this.discount_amount = amount;
        this.discount_approved_by = approvedBy;
        this.calculateTotal();
    }

    canBeCancelled(): boolean {
        return ['pending', 'processing'].includes(this.status);
    }

    updateStatus(newStatus: string): void {
        const validStatuses = ['pending', 'processing', 'ready', 'in_transit', 'delivered', 'cancelled'];
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
        this.status = newStatus;
    }

    async save(): Promise<SalesOrder> {
        return this;
    }

    static async findById(id: number): Promise<SalesOrder | null> {
        return null;
    }

    static async findAll(filters?: { status?: string; customer_name?: string }): Promise<SalesOrder[]> {
        return [];
    }

    toJSON(): object {
        return {
            id: this.id,
            order_number: this.order_number,
            customer_name: this.customer_name,
            customer_email: this.customer_email,
            customer_phone: this.customer_phone,
            shipping_address: this.shipping_address,
            delivery_type: this.delivery_type,
            status: this.status,
            payment_status: this.payment_status,
            subtotal: this.subtotal,
            discount_amount: this.discount_amount,
            tax: this.tax,
            shipping_cost: this.shipping_cost,
            total_amount: this.total_amount,
            items: this.items,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}