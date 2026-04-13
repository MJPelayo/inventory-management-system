// backend/src/models/Product.ts
import pool from '../db/pool';

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

    // Getters
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

    // Setters with validation
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

    // Business Logic
    applyDiscount(percentage: number): number {
        if (percentage < 0 || percentage > 100) {
            throw new Error('Discount must be between 0 and 100');
        }
        return this.price * (1 - percentage / 100);
    }

    // CRUD Operations
    async save(): Promise<Product> {
        const client = await pool.connect();
        try {
            if (this.id) {
                // UPDATE
                const query = `
                    UPDATE products 
                    SET name = $1, description = $2, sku = $3, price = $4, 
                        cost = $5, category_id = $6, supplier_id = $7, 
                        brand = $8, image_url = $9, is_active = $10,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $11
                    RETURNING *
                `;
                const values = [
                    this.name, this.description, this.sku, this.price,
                    this.cost, this.category_id, this.supplier_id,
                    this.brand, this.image_url, this.is_active, this.id
                ];
                const result = await client.query(query, values);
                return new Product(result.rows[0]);
            } else {
                // INSERT
                const query = `
                    INSERT INTO products (name, description, sku, price, cost, 
                        category_id, supplier_id, brand, image_url)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING *
                `;
                const values = [
                    this.name, this.description, this.sku, this.price,
                    this.cost, this.category_id, this.supplier_id,
                    this.brand, this.image_url
                ];
                const result = await client.query(query, values);
                return new Product(result.rows[0]);
            }
        } finally {
            client.release();
        }
    }

    static async findById(id: number): Promise<Product | null> {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT p.*, c.name as category_name, s.name as supplier_name 
                 FROM products p
                 LEFT JOIN categories c ON p.category_id = c.id
                 LEFT JOIN suppliers s ON p.supplier_id = s.id
                 WHERE p.id = $1`,
                [id]
            );
            if (result.rows.length === 0) return null;
            return new Product(result.rows[0]);
        } finally {
            client.release();
        }
    }

    static async findBySku(sku: string): Promise<Product | null> {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM products WHERE sku = $1', [sku]);
            if (result.rows.length === 0) return null;
            return new Product(result.rows[0]);
        } finally {
            client.release();
        }
    }

    static async findAll(filters?: { 
        category_id?: number; 
        supplier_id?: number;
        is_active?: boolean;
        search?: string;
    }): Promise<Product[]> {
        const client = await pool.connect();
        try {
            let query = 'SELECT * FROM products WHERE 1=1';
            const values: any[] = [];
            let paramCount = 1;

            if (filters?.category_id) {
                query += ` AND category_id = $${paramCount++}`;
                values.push(filters.category_id);
            }
            if (filters?.supplier_id) {
                query += ` AND supplier_id = $${paramCount++}`;
                values.push(filters.supplier_id);
            }
            if (filters?.is_active !== undefined) {
                query += ` AND is_active = $${paramCount++}`;
                values.push(filters.is_active);
            }
            if (filters?.search) {
                query += ` AND (name ILIKE $${paramCount++} OR sku ILIKE $${paramCount++})`;
                values.push(`%${filters.search}%`, `%${filters.search}%`);
            }
            query += ' ORDER BY name';

            const result = await client.query(query, values);
            return result.rows.map((row: any) => new Product(row));
        } finally {
            client.release();
        }
    }

    static async deleteById(id: number): Promise<boolean> {
        const client = await pool.connect();
        try {
            // Check if product has inventory first
            const inventoryCheck = await client.query(
                'SELECT id FROM inventory WHERE product_id = $1 LIMIT 1',
                [id]
            );
            if (inventoryCheck.rows.length > 0) {
                throw new Error('Cannot delete product with existing inventory records');
            }
            
            const result = await client.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
            return result.rows.length > 0;
        } finally {
            client.release();
        }
    }

    async getInventory(): Promise<any[]> {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT i.*, w.name as warehouse_name, w.location 
                 FROM inventory i
                 JOIN warehouses w ON i.warehouse_id = w.id
                 WHERE i.product_id = $1`,
                [this.id]
            );
            return result.rows;
        } finally {
            client.release();
        }
    }

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