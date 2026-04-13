// backend/src/models/User.ts
import pool from '../db/pool';

/**
 * User role enumeration for type safety
 */
export enum UserRole {
    ADMIN = 'admin',
    SALES = 'sales',
    WAREHOUSE = 'warehouse',
    SUPPLY = 'supply'
}

/**
 * Permission mapping for role-based access control
 */
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    [UserRole.ADMIN]: ['create_user', 'edit_user', 'delete_user', 'view_all_reports', 'system_settings'],
    [UserRole.SALES]: ['create_order', 'view_products', 'apply_discount'],
    [UserRole.WAREHOUSE]: ['receive_stock', 'transfer_stock', 'adjust_stock'],
    [UserRole.SUPPLY]: ['create_po', 'manage_suppliers']
};

/**
 * Validation constants
 */
const VALIDATION_CONSTANTS = {
    NAME_MIN_LENGTH: 2,
    PASSWORD_MIN_LENGTH: 8,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    DEFAULT_COMMISSION_RATE: 5.0,
    MAX_EMAIL_LENGTH: 255,
    MAX_NAME_LENGTH: 100
} as const;

/**
 * Custom error class for User-specific errors
 */
export class UserError extends Error {
    public statusCode: number;
    
    constructor(message: string, statusCode: number = 400) {
        super(message);
        this.name = 'UserError';
        this.statusCode = statusCode;
        
        
    }
}

/**
 * User data interface with strict typing
 */
export interface UserData {
    id?: number;
    name: string;
    email: string;
    password_hash: string;
    role: UserRole;
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

/**
 * User model class with comprehensive validation, business logic, and CRUD operations
 */
export class User {
    // Private properties with type annotations
    private id: number | null;
    private name: string;
    private email: string;
    private password_hash: string;
    private role: UserRole;
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

    /**
     * Constructor with validation
     * @param data - User data object
     * @throws {UserError} If validation fails
     */
    constructor(data: UserData) {
        this.id = data.id || null;
        this.name = data.name;
        this.email = data.email;
        this.password_hash = data.password_hash;
        this.role = data.role;
        this.department = data.department || null;
        this.sales_target = data.sales_target || null;
        this.commission_rate = data.commission_rate ?? VALIDATION_CONSTANTS.DEFAULT_COMMISSION_RATE;
        this.warehouse_id = data.warehouse_id || null;
        this.shift = data.shift || null;
        this.purchase_budget = data.purchase_budget || null;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.last_login = data.last_login || null;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;

        // Validate on construction
        this.validate();
    }

    // ==================== GETTERS ====================

    getId(): number | null { return this.id; }
    getName(): string { return this.name; }
    getEmail(): string { return this.email; }
    getRole(): UserRole { return this.role; }
    getPasswordHash(): string { return this.password_hash; }
    isActive(): boolean { return this.is_active; }
    getCommissionRate(): number { return this.commission_rate; }
    getWarehouseId(): number | null { return this.warehouse_id; }
    getDepartment(): string | null { return this.department; }
    getSalesTarget(): number | null { return this.sales_target; }
    getShift(): string | null { return this.shift; }
    getPurchaseBudget(): number | null { return this.purchase_budget; }
    getLastLogin(): Date | null { return this.last_login; }
    getCreatedAt(): Date | null { return this.created_at; }
    getUpdatedAt(): Date | null { return this.updated_at; }

    // ==================== SETTERS WITH VALIDATION ====================

    /**
     * Set user name with validation
     * @param name - New name
     * @throws {UserError} If validation fails
     */
    setName(name: string): void {
        if (!name || name.trim().length < VALIDATION_CONSTANTS.NAME_MIN_LENGTH) {
            throw new UserError(
                `Name must be at least ${VALIDATION_CONSTANTS.NAME_MIN_LENGTH} characters`,
                400
            );
        }
        if (name.length > VALIDATION_CONSTANTS.MAX_NAME_LENGTH) {
            throw new UserError(
                `Name cannot exceed ${VALIDATION_CONSTANTS.MAX_NAME_LENGTH} characters`,
                400
            );
        }
        this.name = name.trim();
    }

    /**
     * Set user email with validation
     * @param email - New email
     * @throws {UserError} If validation fails
     */
    setEmail(email: string): void {
        if (!VALIDATION_CONSTANTS.EMAIL_REGEX.test(email)) {
            throw new UserError('Invalid email format', 400);
        }
        if (email.length > VALIDATION_CONSTANTS.MAX_EMAIL_LENGTH) {
            throw new UserError(
                `Email cannot exceed ${VALIDATION_CONSTANTS.MAX_EMAIL_LENGTH} characters`,
                400
            );
        }
        this.email = email.toLowerCase().trim();
    }

    /**
     * Set user password hash with validation
     * @param password - New password hash
     * @throws {UserError} If validation fails
     */
    setPasswordHash(password: string): void {
        if (!password || password.length < VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH) {
            throw new UserError(
                `Password must be at least ${VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH} characters`,
                400
            );
        }
        this.password_hash = password;
    }

    /**
     * Set user role with validation
     * @param role - New role
     * @throws {UserError} If validation fails
     */
    setRole(role: UserRole): void {
        const validRoles = Object.values(UserRole);
        if (!validRoles.includes(role)) {
            throw new UserError(
                `Role must be one of: ${validRoles.join(', ')}`,
                400
            );
        }
        this.role = role;
    }

    /**
     * Set commission rate with validation
     * @param rate - New commission rate (0-100)
     * @throws {UserError} If validation fails
     */
    setCommissionRate(rate: number): void {
        if (rate < 0 || rate > 100) {
            throw new UserError('Commission rate must be between 0 and 100', 400);
        }
        this.commission_rate = rate;
    }

    // ==================== BUSINESS LOGIC ====================

    /**
     * Check if user can perform a specific action based on role
     * @param action - Action to check permission for
     * @returns True if user has permission, false otherwise
     */
    canPerformAction(action: string): boolean {
        return ROLE_PERMISSIONS[this.role]?.includes(action) || false;
    }

    /**
     * Get all permissions for the user's role
     * @returns Array of permission strings
     */
    getPermissions(): string[] {
        return ROLE_PERMISSIONS[this.role] || [];
    }

    /**
     * Update last login timestamp
     */
    updateLastLogin(): void {
        this.last_login = new Date();
    }

    /**
     * Deactivate user account
     */
    deactivate(): void {
        this.is_active = false;
    }

    /**
     * Activate user account
     */
    activate(): void {
        this.is_active = true;
    }

    /**
     * Calculate expected commission based on sales amount
     * @param salesAmount - Total sales amount
     * @returns Commission amount
     */
    calculateCommission(salesAmount: number): number {
        if (this.role !== UserRole.SALES) {
            return 0;
        }
        return (salesAmount * this.commission_rate) / 100;
    }

    /**
     * Check if user has reached sales target
     * @param currentSales - Current sales amount
     * @returns True if target reached or no target set, false otherwise
     */
    hasReachedSalesTarget(currentSales: number): boolean {
        if (!this.sales_target) {
            return true;
        }
        return currentSales >= this.sales_target;
    }

    // ==================== VALIDATION ====================

    /**
     * Validate all user properties
     * @throws {UserError} If any validation fails
     */
    private validate(): void {
        if (!this.name || this.name.length < VALIDATION_CONSTANTS.NAME_MIN_LENGTH) {
            throw new UserError(
                `Name must be at least ${VALIDATION_CONSTANTS.NAME_MIN_LENGTH} characters`,
                400
            );
        }

        if (!VALIDATION_CONSTANTS.EMAIL_REGEX.test(this.email)) {
            throw new UserError('Invalid email format', 400);
        }

        if (!this.password_hash || this.password_hash.length < VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH) {
            throw new UserError(
                `Password must be at least ${VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH} characters`,
                400
            );
        }

        const validRoles = Object.values(UserRole);
        if (!validRoles.includes(this.role)) {
            throw new UserError(
                `Role must be one of: ${validRoles.join(', ')}`,
                400
            );
        }

        if (this.commission_rate < 0 || this.commission_rate > 100) {
            throw new UserError('Commission rate must be between 0 and 100', 400);
        }
    }

    // ==================== CRUD OPERATIONS ====================

    /**
     * Save user to database (insert or update)
     * @returns Updated user object
     * @throws {UserError} If database operation fails
     */
    async save(): Promise<User> {
        this.validate();

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
                
                if (result.rows.length === 0) {
                    throw new UserError('User not found', 404);
                }
                
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
        } catch (error) {
            if (error instanceof UserError) {
                throw error;
            }
            // Handle database-specific errors
            if ((error as any).code === '23505') { // Unique violation
                throw new UserError('Email already exists', 409);
            }
            throw new UserError('Failed to save user', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Find user by ID
     * @param id - User ID
     * @returns User object or null if not found
     */
    static async findById(id: number): Promise<User | null> {
        if (!id || id <= 0) {
            throw new UserError('Invalid user ID', 400);
        }

        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
            if (result.rows.length === 0) return null;
            return new User(result.rows[0]);
        } finally {
            client.release();
        }
    }

    /**
     * Find user by email
     * @param email - User email
     * @returns User object or null if not found
     */
    static async findByEmail(email: string): Promise<User | null> {
        if (!email || !VALIDATION_CONSTANTS.EMAIL_REGEX.test(email)) {
            throw new UserError('Invalid email format', 400);
        }

        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) return null;
            return new User(result.rows[0]);
        } finally {
            client.release();
        }
    }

    /**
     * Find all users with optional filters
     * @param filters - Optional filters (role, is_active)
     * @returns Array of User objects
     */
    static async findAll(filters?: { 
        role?: UserRole; 
        is_active?: boolean;
        department?: string;
        limit?: number;
        offset?: number;
    }): Promise<User[]> {
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
            if (filters?.department) {
                query += ` AND department ILIKE $${paramCount++}`;
                values.push(`%${filters.department}%`);
            }
            
            query += ' ORDER BY created_at DESC';
            
            if (filters?.limit) {
                query += ` LIMIT $${paramCount++}`;
                values.push(filters.limit);
            }
            if (filters?.offset) {
                query += ` OFFSET $${paramCount++}`;
                values.push(filters.offset);
            }

            const result = await client.query(query, values);
            return result.rows.map((row: any) => new User(row));
        } finally {
            client.release();
        }
    }

    /**
     * Delete user by ID
     * @param id - User ID
     * @returns True if deleted, false otherwise
     * @throws {UserError} If validation fails
     */
    static async deleteById(id: number): Promise<boolean> {
        if (!id || id <= 0) {
            throw new UserError('Invalid user ID', 400);
        }

        const client = await pool.connect();
        try {
            // Check if user has any associated records before deletion
            const checkQuery = `
                SELECT COUNT(*) as count 
                FROM (
                    SELECT 1 FROM orders WHERE created_by = $1
                    UNION ALL
                    SELECT 1 FROM inventory_logs WHERE user_id = $1
                ) as records
            `;
            const checkResult = await client.query(checkQuery, [id]);
            
            if (parseInt(checkResult.rows[0].count) > 0) {
                throw new UserError(
                    'Cannot delete user with associated records. Please deactivate instead.',
                    409
                );
            }
            
            const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
            return result.rows.length > 0;
        } catch (error) {
            if (error instanceof UserError) {
                throw error;
            }
            throw new UserError('Failed to delete user', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Update user password
     * @param newPasswordHash - New password hash
     * @throws {UserError} If validation fails or user not found
     */
    async updatePassword(newPasswordHash: string): Promise<void> {
        if (!this.id) {
            throw new UserError('Cannot update password for unsaved user', 400);
        }

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

    /**
     * Count total users with optional filters
     * @param filters - Optional filters (role, is_active)
     * @returns Total count of users
     */
    static async count(filters?: { 
        role?: UserRole; 
        is_active?: boolean;
        department?: string;
    }): Promise<number> {
        const client = await pool.connect();
        try {
            let query = 'SELECT COUNT(*) as count FROM users WHERE 1=1';
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
            if (filters?.department) {
                query += ` AND department ILIKE $${paramCount++}`;
                values.push(`%${filters.department}%`);
            }

            const result = await client.query(query, values);
            return parseInt(result.rows[0].count);
        } finally {
            client.release();
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Convert user to JSON object (excludes sensitive data)
     * @returns Safe user object without password hash
     */
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
            purchase_budget: this.purchase_budget,
            is_active: this.is_active,
            last_login: this.last_login,
            created_at: this.created_at,
            updated_at: this.updated_at,
            permissions: this.getPermissions()
        };
    }

    /**
     * Convert user to detailed JSON with additional computed properties
     * @returns Detailed user object
     */
    toDetailedJSON(): object {
        return {
            ...this.toJSON(),
            has_sales_target: this.sales_target !== null,
            has_warehouse_assignment: this.warehouse_id !== null
        };
    }
}