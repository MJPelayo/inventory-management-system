// backend/typescript-demo/User.ts
// THIS IS FOR DEMONSTRATION ONLY - Not used in actual runtime

export interface UserData {
    id?: number;
    name: string;
    email: string;
    password_hash: string;
    role: 'admin' | 'sales' | 'warehouse' | 'supply';
    department?: string;
    sales_target?: number;
    commission_rate?: number;
    warehouse_id?: number;
    shift?: string;
    purchase_budget?: number;
    is_active?: boolean;
    last_login?: Date;
    created_at?: Date;
    updated_at?: Date;
}

export class User {
    // Private properties with TypeScript types
    private id: number | null;
    private name: string;
    private email: string;
    private password_hash: string;
    private role: 'admin' | 'sales' | 'warehouse' | 'supply';
    private department: string | null;
    private sales_target: number | null;
    private commission_rate: number;
    private warehouse_id: number | null;
    private shift: string | null;
    private purchase_budget: number | null;
    private is_active: boolean;
    private last_login: Date | null;
    private created_at: Date | null;
    private updated_at: Date | null;

    // Constructor with TypeScript typing
    constructor(data: UserData) {
        this.id = data.id || null;
        this.name = data.name;
        this.email = data.email;
        this.password_hash = data.password_hash;
        this.role = data.role;
        this.department = data.department || null;
        this.sales_target = data.sales_target || null;
        this.commission_rate = data.commission_rate || 5.0;
        this.warehouse_id = data.warehouse_id || null;
        this.shift = data.shift || null;
        this.purchase_budget = data.purchase_budget || null;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.last_login = data.last_login || null;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    // TypeScript getters with return types
    getId(): number | null { return this.id; }
    getName(): string { return this.name; }
    getEmail(): string { return this.email; }
    getRole(): string { return this.role; }
    getPasswordHash(): string { return this.password_hash; }
    isActive(): boolean { return this.is_active; }
    getCommissionRate(): number { return this.commission_rate; }
    getWarehouseId(): number | null { return this.warehouse_id; }

    // Setters with TypeScript validation
    setName(name: string): void {
        if (!name || name.length < 2) {
            throw new Error('Name must be at least 2 characters');
        }
        this.name = name;
    }

    setEmail(email: string): void {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }
        this.email = email;
    }

    setPasswordHash(password: string): void {
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }
        this.password_hash = password;
    }

    setRole(role: string): void {
        const validRoles = ['admin', 'sales', 'warehouse', 'supply'];
        if (!validRoles.includes(role)) {
            throw new Error(`Role must be one of: ${validRoles.join(', ')}`);
        }
        this.role = role as 'admin' | 'sales' | 'warehouse' | 'supply';
    }

    // Business Logic with TypeScript return type
    canPerformAction(action: string): boolean {
        const permissions: Record<string, string[]> = {
            admin: ['create_user', 'edit_user', 'delete_user', 'view_all_reports', 'system_settings'],
            sales: ['create_order', 'view_products', 'apply_discount'],
            warehouse: ['receive_stock', 'transfer_stock', 'adjust_stock'],
            supply: ['create_po', 'manage_suppliers']
        };
        return permissions[this.role]?.includes(action) || false;
    }

    updateLastLogin(): void {
        this.last_login = new Date();
    }

    deactivate(): void {
        this.is_active = false;
    }

    activate(): void {
        this.is_active = true;
    }

    // Async methods with Promise return types
    async save(): Promise<User> {
        // Implementation would be same as JavaScript version
        // but with TypeScript typing
        return this;
    }

    static async findById(id: number): Promise<User | null> {
        // Implementation
        return null;
    }

    static async findByEmail(email: string): Promise<User | null> {
        // Implementation
        return null;
    }

    static async findAll(filters?: { role?: string; is_active?: boolean }): Promise<User[]> {
        // Implementation
        return [];
    }

    static async deleteById(id: number): Promise<boolean> {
        // Implementation
        return false;
    }

    // toJSON with TypeScript return type
    toJSON(): object {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            role: this.role,
            department: this.department,
            sales_target: this.sales_target,
            commission_rate: this.commission_rate,
            warehouse_id: this.warehouse_id,
            shift: this.shift,
            is_active: this.is_active,
            last_login: this.last_login,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}