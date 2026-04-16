// backend/src/models/Category.js
const pool = require('../db/pool');

class Category {
    constructor(data) {
        this.id = data.id || null;
        this.name = data.name;
        this.parent_id = data.parent_id || null;
        this.description = data.description || null;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    getId() { return this.id; }
    getName() { return this.name; }
    getParentId() { return this.parent_id; }

    setName(name) {
        if (!name || name.length < 2) {
            throw new Error('Category name must be at least 2 characters');
        }
        this.name = name;
    }

    async getFullPath() {
        if (!this.parent_id) return this.name;
        const parent = await Category.findById(this.parent_id);
        if (!parent) return this.name;
        const parentPath = await parent.getFullPath();
        return `${parentPath} > ${this.name}`;
    }

    async getChildren() {
        const client = await pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM categories WHERE parent_id = $1 ORDER BY name',
                [this.id]
            );
            return result.rows.map(row => new Category(row));
        } finally {
            client.release();
        }
    }

    async save() {
        const client = await pool.connect();
        try {
            if (this.id) {
                const query = `
                    UPDATE categories 
                    SET name = $1, parent_id = $2, description = $3,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $4
                    RETURNING *
                `;
                const result = await client.query(query, [this.name, this.parent_id, this.description, this.id]);
                return new Category(result.rows[0]);
            } else {
                const query = `
                    INSERT INTO categories (name, parent_id, description)
                    VALUES ($1, $2, $3)
                    RETURNING *
                `;
                const result = await client.query(query, [this.name, this.parent_id, this.description]);
                return new Category(result.rows[0]);
            }
        } finally {
            client.release();
        }
    }

    static async findById(id) {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM categories WHERE id = $1', [id]);
            if (result.rows.length === 0) return null;
            return new Category(result.rows[0]);
        } finally {
            client.release();
        }
    }

    static async findAll() {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM categories ORDER BY name');
            return result.rows.map(row => new Category(row));
        } finally {
            client.release();
        }
    }

    static async getTree() {
        const allCategories = await Category.findAll();
        
        const buildTree = (parentId = null) => {
            return allCategories
                .filter(cat => cat.getParentId() === parentId)
                .map(cat => ({
                    ...cat.toJSON(),
                    children: buildTree(cat.getId())
                }));
        };
        
        return buildTree(null);
    }

    async delete() {
        const client = await pool.connect();
        try {
            const children = await this.getChildren();
            if (children.length > 0) {
                throw new Error('Cannot delete category with child categories');
            }
            
            const result = await client.query('DELETE FROM categories WHERE id = $1 RETURNING id', [this.id]);
            return result.rows.length > 0;
        } finally {
            client.release();
        }
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            parent_id: this.parent_id,
            description: this.description,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = { Category };