// backend/src/models/User.js
const { BaseModel } = require('./BaseModel');
const pool = require('../db/pool');

class User extends BaseModel {
    constructor(data) {
        super('users', data);
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
    }

    // Getters
    getName() { return this.name; }
    getEmail() { return this.email; }
    getRole() { return this.role; }
    getPasswordHash() { return this.password_hash; }
    isActive() { return this.is_active; }
    getCommissionRate() { return this.commission_rate; }
    getWarehouseId() { return this.warehouse_id; }

    // Setters with validation
    setName(name) {
        if (!name || name.length < 2) {
            throw new Error('Name must be at least 2 characters');
        }
        this.name = name;
    }

    setEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }
        this.email = email;
    }

    setPasswordHash(password) {
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }
        this.password_hash = password;
    }

    setRole(role) {
        const validRoles = ['admin', 'sales', 'warehouse', 'supply'];
        if (!validRoles.includes(role)) {
            throw new Error(`Role must be one of: ${validRoles.join(', ')}`);
        }
        this.role = role;
    }

    // Business Logic
    canPerformAction(action) {
        const permissions = {
            admin: ['create_user', 'edit_user', 'delete_user', 'view_all_reports', 'system_settings'],
            sales: ['create_order', 'view_products', 'apply_discount'],
            warehouse: ['receive_stock', 'transfer_stock', 'adjust_stock'],
            supply: ['create_po', 'manage_suppliers']
        };
        return permissions[this.role]?.includes(action) || false;
    }

    updateLastLogin() {
        this.last_login = new Date();
    }

    deactivate() {
        this.is_active = false;
    }

    activate() {
        this.is_active = true;
    }

    // Required methods for polymorphism
    _getInsertFields() {
        return ['name', 'email', 'password_hash', 'role', 'department', 
                'sales_target', 'commission_rate', 'warehouse_id', 'shift', 
                'purchase_budget', 'is_active'];
    }

    _getUpdateFields() {
        return ['name', 'email', 'role', 'department', 'sales_target', 
                'commission_rate', 'warehouse_id', 'shift', 'purchase_budget', 
                'is_active', 'last_login'];
    }

    // Override _hydrate to return User instances
    _hydrate(data) {
        return new User(data);
    }

    static async findByEmail(email) {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) return null;
            return new User(result.rows[0]);
        } finally {
            client.release();
        }
    }

    async updatePassword(newPasswordHash) {
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
    toJSON() {
        return {
            ...super.toJSON(),
            name: this.name,
            email: this.email,
            role: this.role,
            department: this.department,
            sales_target: this.sales_target,
            commission_rate: this.commission_rate,
            warehouse_id: this.warehouse_id,
            shift: this.shift,
            is_active: this.is_active,
            last_login: this.last_login
        };
    }
}

module.exports = { User };