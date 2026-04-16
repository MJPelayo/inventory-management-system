// backend/typescript-demo/Inventory.ts
// TypeScript version of Inventory model for demonstration

export interface InventoryData {
    id?: number;
    product_id: number;
    warehouse_id: number;
    quantity: number;
    reorder_point?: number;
    max_stock?: number;
    created_at?: Date;
    updated_at?: Date;
}

export class Inventory {
    private id: number | null;
    private product_id: number;
    private warehouse_id: number;
    private quantity: number;
    private reorder_point: number;
    private max_stock: number;
    private created_at: Date | null;
    private updated_at: Date | null;

    constructor(data: InventoryData) {
        this.id = data.id || null;
        this.product_id = data.product_id;
        this.warehouse_id = data.warehouse_id;
        this.quantity = data.quantity || 0;
        this.reorder_point = data.reorder_point || 0;
        this.max_stock = data.max_stock || 0;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    getQuantity(): number { return this.quantity; }
    getProductId(): number { return this.product_id; }
    getWarehouseId(): number { return this.warehouse_id; }
    
    isLowStock(): boolean {
        return this.quantity <= this.reorder_point && this.quantity > 0;
    }
    
    isOutOfStock(): boolean {
        return this.quantity === 0;
    }
    
    canFulfill(quantity: number): boolean {
        return this.quantity >= quantity;
    }

    addStock(quantity: number, reason: string, performedBy: number, reference?: string): void {
        if (quantity <= 0) throw new Error('Quantity must be positive');
        this.quantity += quantity;
    }

    removeStock(quantity: number, reason: string, performedBy: number, reference?: string): void {
        if (quantity <= 0) throw new Error('Quantity must be positive');
        if (!this.canFulfill(quantity)) {
            throw new Error(`Insufficient stock. Available: ${this.quantity}, Requested: ${quantity}`);
        }
        this.quantity -= quantity;
    }

    async save(): Promise<Inventory> {
        return this;
    }

    static async findByProductAndWarehouse(productId: number, warehouseId: number): Promise<Inventory | null> {
        return null;
    }

    static async findByWarehouse(warehouseId: number): Promise<Inventory[]> {
        return [];
    }

    static async getLowStock(): Promise<Inventory[]> {
        return [];
    }

    toJSON(): object {
        return {
            id: this.id,
            product_id: this.product_id,
            warehouse_id: this.warehouse_id,
            quantity: this.quantity,
            reorder_point: this.reorder_point,
            max_stock: this.max_stock,
            is_low_stock: this.isLowStock(),
            is_out_of_stock: this.isOutOfStock(),
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}