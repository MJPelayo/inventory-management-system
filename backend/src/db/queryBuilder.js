/**
 * Safe Query Builder
 * Ensures all database queries use parameterized statements
 */

class SafeQueryBuilder {
    constructor() {
        this.query = '';
        this.params = [];
        this.paramCount = 1;
    }
    
    /**
     * Start building a SELECT query
     */
    select(fields = '*', table) {
        this.query = `SELECT ${fields} FROM ${this.escapeIdentifier(table)}`;
        return this;
    }
    
    /**
     * Add WHERE conditions safely
     */
    where(condition, value) {
        if (this.query.includes('WHERE')) {
            this.query += ` AND ${condition}`;
        } else {
            this.query += ` WHERE ${condition}`;
        }
        this.params.push(value);
        this.paramCount++;
        return this;
    }
    
    /**
     * Add WHERE with LIKE (escapes special characters)
     */
    whereLike(field, value) {
        const escapedValue = value.replace(/[%_]/g, '\\$&');
        return this.where(`${field} ILIKE $${this.paramCount}`, `%${escapedValue}%`);
    }
    
    /**
     * Add WHERE IN clause safely
     */
    whereIn(field, values) {
        if (!values || values.length === 0) return this;
        
        const placeholders = values.map((_, i) => `$${this.paramCount + i}`).join(', ');
        this.params.push(...values);
        this.paramCount += values.length;
        
        if (this.query.includes('WHERE')) {
            this.query += ` AND ${field} IN (${placeholders})`;
        } else {
            this.query += ` WHERE ${field} IN (${placeholders})`;
        }
        return this;
    }
    
    /**
     * Add ORDER BY safely
     */
    orderBy(field, direction = 'ASC') {
        const validDirections = ['ASC', 'DESC'];
        const safeDirection = validDirections.includes(direction.toUpperCase()) ? direction.toUpperCase() : 'ASC';
        this.query += ` ORDER BY ${this.escapeIdentifier(field)} ${safeDirection}`;
        return this;
    }
    
    /**
     * Add LIMIT and OFFSET
     */
    limit(limit, offset = 0) {
        const safeLimit = Math.min(Math.max(1, parseInt(limit) || 10), 1000);
        const safeOffset = Math.max(0, parseInt(offset) || 0);
        this.query += ` LIMIT $${this.paramCount++} OFFSET $${this.paramCount++}`;
        this.params.push(safeLimit, safeOffset);
        return this;
    }
    
    /**
     * Build and return the query
     */
    build() {
        return {
            text: this.query,
            values: this.params
        };
    }
    
    /**
     * Escape identifier (table/column name) - use with caution, only for trusted names
     */
    escapeIdentifier(identifier) {
        // Only allow alphanumeric and underscore
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
            throw new Error(`Invalid identifier: ${identifier}`);
        }
        return `"${identifier}"`;
    }
    
    /**
     * Reset the builder
     */
    reset() {
        this.query = '';
        this.params = [];
        this.paramCount = 1;
        return this;
    }
}

module.exports = { SafeQueryBuilder };