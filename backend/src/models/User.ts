// backend/src/models/User.ts
import pool from '../db/pool.js';

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
    // Private properties
    private id: number | null;
    private name: string;
    private email: string;
    private password_hash: string;
    private role: string;
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

    // Constructor
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

    // Getters
    getId(): number | null { return this.id; }
    getName(): string { return this.name; }
    getEmail(): string { return this.email; }
    getRole(): string { return this.role; }
    getPasswordHash(): string { return this.password_hash; }
    isActive(): boolean { return this.is_active; }
    getCommissionRate(): number { return this.commission_rate; }
    getWarehouseId(): number | null { return this.warehouse_id; }

    // Setters with validation
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
        this.role = role;
    }

    // Business Logic
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

    // CRUD Operations
    async save(): Promise<User> {
        const client = await pool.connect();
        try {
            if (this.id) {
                // UPDATE existing user
                const query = `
                    UPDATE users 
                    SET name = $1, email = $2, role = $3, department = $4,
                        sales_target = $5, commission_rate = $6, warehouse_id = $7,
                        shift = $8, purchase_budget = $9, is_active = $10,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $11
                    RETURNING *
                `;
                const values = [
                    this.name, this.email, this.role, this.department,
                    this.sales_target, this.commission_rate, this.warehouse_id,
                    this.shift, this.purchase_budget, this.is_active, this.id
                ];
                const result = await client.query(query, values);
                return new User(result.rows[0]);
            } else {
                // INSERT new user
                const query = `
                    INSERT INTO users (name, email, password_hash, role, department,
                        sales_target, commission_rate, warehouse_id, shift, purchase_budget)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING *
                `;
                const values = [
                    this.name, this.email, this.password_hash, this.role, this.department,
                    this.sales_target, this.commission_rate, this.warehouse_id,
                    this.shift, this.purchase_budget
                ];
                const result = await client.query(query, values);
                return new User(result.rows[0]);
            }
        } finally {
            client.release();
        }
    }

    static async findById(id: number): Promise<User | null> {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
            if (result.rows.length === 0) return null;
            return new User(result.rows[0]);
        } finally {
            client.release();
        }
    }

    static async findByEmail(email: string): Promise<User | null> {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) return null;
            return new User(result.rows[0]);
        } finally {
            client.release();
        }
    }

    static async findAll(filters?: { role?: string; is_active?: boolean }): Promise<User[]> {
        const client = await pool.connect();
        try {
            let query = 'SELECT * FROM users WHERE 1=1';
            const values: any[] = [];
            let paramCount = 1;

            if (filters?.role) {
                query += ` AND role = $${paramCount++}`;
                values.push(filters.role);
            }
            if (filters?.is_active !== undefined) {
                query += ` AND is_active = $${paramCount++}`;
                values.push(filters.is_active);
            }
            query += ' ORDER BY name';

            const result = await client.query(query, values);
            return result.rows.map(row => new User(row));
        } finally {
            client.release();
        }
    }

    static async deleteById(id: number): Promise<boolean> {
        const client = await pool.connect();
        try {
            const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
            return result.rows.length > 0;
        } finally {
            client.release();
        }
    }

    async updatePassword(newPasswordHash: string): Promise<void> {
        this.setPasswordHash(newPasswordHash);
        const client = await pool.connect();
        try {
            await client.query(
                'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [newPasswordHash, this.id]
            );
            this.password_hash = newPasswordHash;
        } finally {
            client.release();
        }
    }

    // toJSON - excludes sensitive data
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