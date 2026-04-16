// backend/typescript-demo/Product.ts
export interface ProductData {
    id?: number;
    name: string;
    description?: string;
    sku: string;
    price: number;
    cost: number;
    category_id?: number;
    supplier_id?: number;
    brand?: string;
    image_url?: string;
    is_active?: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export class Product {
    // Private properties with TypeScript types
    private id: number | null;
    private name: string;
    private description: string | null;
    private sku: string;
    private price: number;
    private cost: number;
    private category_id: number | null;
    private supplier_id: number | null;
    private brand: string | null;
    private image_url: string | null;
    private is_active: boolean;
    private created_at: Date | null;
    private updated_at: Date | null;

    constructor(data: ProductData) {
        this.id = data.id || null;
        this.name = data.name;
        this.description = data.description || null;
        this.sku = data.sku;
        this.price = data.price;
        this.cost = data.cost;
        this.category_id = data.category_id || null;
        this.supplier_id = data.supplier_id || null;
        this.brand = data.brand || null;
        this.image_url = data.image_url || null;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    // TypeScript getters with return types
    getId(): number | null { return this.id; }
    getName(): string { return this.name; }
    getSku(): string { return this.sku; }
    getPrice(): number { return this.price; }
    getCost(): number { return this.cost; }
    getProfitMargin(): number { 
        if (this.price === 0) return 0;
        return ((this.price - this.cost) / this.price) * 100;
    }
    isActive(): boolean { return this.is_active; }

    // Setters with TypeScript validation
    setName(name: string): void {
        if (!name || name.length < 2) {
            throw new Error('Product name must be at least 2 characters');
        }
        this.name = name;
    }

    setSku(sku: string): void {
        if (!sku || sku.length < 2) {
            throw new Error('SKU must be at least 2 characters');
        }
        this.sku = sku;
    }

    setPrice(price: number): void {
        if (price < 0) {
            throw new Error('Price cannot be negative');
        }
        if (price < this.cost) {
            throw new Error('Price cannot be less than cost');
        }
        this.price = price;
    }

    setCost(cost: number): void {
        if (cost < 0) {
            throw new Error('Cost cannot be negative');
        }
        if (this.price > 0 && cost > this.price) {
            throw new Error('Cost cannot be greater than price');
        }
        this.cost = cost;
    }

    // Business Logic with TypeScript return type
    applyDiscount(percentage: number): number {
        if (percentage < 0 || percentage > 100) {
            throw new Error('Discount must be between 0 and 100');
        }
        return this.price * (1 - percentage / 100);
    }

    // Async methods with Promise return types
    async save(): Promise<Product> {
        // Implementation would be same as JavaScript version
        // This is just the TypeScript signature for demo
        return this;
    }

    static async findById(id: number): Promise<Product | null> {
        // Implementation
        return null;
    }

    static async findBySku(sku: string): Promise<Product | null> {
        // Implementation
        return null;
    }

    static async findAll(filters?: { 
        category_id?: number; 
        supplier_id?: number;
        is_active?: boolean;
        search?: string;
    }): Promise<Product[]> {
        // Implementation
        return [];
    }

    static async deleteById(id: number): Promise<boolean> {
        // Implementation
        return false;
    }

    async getInventory(): Promise<any[]> {
        // Implementation
        return [];
    }

    // toJSON with TypeScript return type
    toJSON(): object {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            sku: this.sku,
            price: this.price,
            cost: this.cost,
            profit_margin: this.getProfitMargin(),
            category_id: this.category_id,
            supplier_id: this.supplier_id,
            brand: this.brand,
            image_url: this.image_url,
            is_active: this.is_active,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}