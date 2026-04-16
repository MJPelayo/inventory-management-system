// backend/typescript-demo/Category.ts
// TypeScript version of Category model for demonstration

export interface CategoryData {
    id?: number;
    name: string;
    parent_id?: number;
    description?: string;
    created_at?: Date;
    updated_at?: Date;
}

export class Category {
    private id: number | null;
    private name: string;
    private parent_id: number | null;
    private description: string | null;
    private created_at: Date | null;
    private updated_at: Date | null;

    constructor(data: CategoryData) {
        this.id = data.id || null;
        this.name = data.name;
        this.parent_id = data.parent_id || null;
        this.description = data.description || null;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    getId(): number | null { return this.id; }
    getName(): string { return this.name; }
    getParentId(): number | null { return this.parent_id; }

    setName(name: string): void {
        if (!name || name.length < 2) {
            throw new Error('Category name must be at least 2 characters');
        }
        this.name = name;
    }

    async getFullPath(): Promise<string> {
        if (!this.parent_id) return this.name;
        // In real implementation, would fetch parent recursively
        return this.name;
    }

    async getChildren(): Promise<Category[]> {
        // In real implementation, would fetch from database
        return [];
    }

    async save(): Promise<Category> {
        return this;
    }

    static async findById(id: number): Promise<Category | null> {
        return null;
    }

    static async findAll(): Promise<Category[]> {
        return [];
    }

    static async getTree(): Promise<any[]> {
        return [];
    }

    async delete(): Promise<boolean> {
        return false;
    }

    toJSON(): object {
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