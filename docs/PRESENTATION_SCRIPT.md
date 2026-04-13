
---

## 📄 FILE 13: docs/PRESENTATION_SCRIPT.md

```markdown
# Presentation Script for Wednesday

## Slide 1: Title Slide (30 seconds)

"Good morning/afternoon everyone. My name is [Your Name] and today I'll be presenting our Inventory Management System project. This is Checkpoint 1, focusing on UML Mapping and Clean Architecture planning."

---

## Slide 2: Project Overview (1 minute)

"Our Inventory Management System is a comprehensive web application designed to manage multi-warehouse inventory, sales orders, and supply chain operations. The system supports four user roles:

- **Admin** - Full system control
- **Sales Manager** - Process customer orders
- **Warehouse Manager** - Manage stock and locations
- **Supply Manager** - Handle purchase orders

The key design principle is that **products don't track stock - inventory does**. This allows one product to exist in multiple warehouses with different quantities."

---

## Slide 3: UML Class Diagram (2 minutes)

"Here is our UML Class Diagram showing the main entities in our system:

[Point to the diagram]

Let me walk you through the key relationships:

1. **User** is the base class - it handles authentication and role-based permissions
2. **Product** contains catalog information - name, SKU, price, cost
3. **Inventory** links products to warehouses with quantity tracking
4. **SalesOrder** represents customer purchases
5. **StockMovement** provides complete audit trails

Notice that Product doesn't store quantity directly - that's handled by Inventory. This is our key design decision for multi-warehouse support."

---

## Slide 4: Entity Relationship Diagram (1.5 minutes)

"Moving to our database ERD, which follows 3NF normalization:

[Point to ERD]

We have 12 tables in total:

- **users** - Authentication and roles
- **products** - Product catalog
- **categories** - Hierarchical category tree
- **suppliers** - Vendor information
- **warehouses** - Physical storage locations
- **inventory** - Stock levels (junction table)
- **sales_orders** - Customer orders
- **supply_orders** - Purchase orders
- **order_items** - Line items (polymorphic)
- **stock_movements** - Complete audit trail
- **product_locations** - Physical location tracking (aisle/side/shelf/layer)
- **discount_approvals** - Discount workflow

Every table has primary keys, foreign keys, and created_at/updated_at timestamps."

---

## Slide 5: Clean Architecture (2 minutes)

"Our architecture follows strict separation of concerns:

[Show Architecture Diagram]

**Models Layer (TypeScript)**
- Contains ALL business logic
- Handles validation
- Performs CRUD operations
- Executes database queries
- Does NOT know about HTTP

**Controllers Layer (JavaScript)**
- Receives req/res objects
- Calls model methods
- Formats JSON responses
- Handles status codes
- Does NOT write SQL

**Routes Layer (JavaScript)**
- Defines endpoints
- Maps routes to controllers
- Does NOT contain logic

This separation makes our code:
- Testable
- Maintainable
- Scalable"

---

## Slide 6: Code Example - User Model (2 minutes)

"Let me show you a concrete example - our User Model in TypeScript:

```typescript
export class User {
    private id: number | null;
    private name: string;
    private email: string;
    private password_hash: string;
    private role: string;

    constructor(data: UserData) {
        this.id = data.id || null;
        this.name = data.name;
        this.email = data.email;
        this.password_hash = data.password_hash;
        this.role = data.role;
    }

    // Setter with validation
    setEmail(email: string): void {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }
        this.email = email;
    }

    // Business logic
    canPerformAction(action: string): boolean {
        const permissions = {
            admin: ['create_user', 'edit_user', 'delete_user'],
            sales: ['create_order', 'view_products']
        };
        return permissions[this.role]?.includes(action) || false;
    }

    // CRUD with database
    async save(): Promise<User> {
        const query = 'INSERT INTO users ... RETURNING *';
        const result = await pool.query(query, values);
        return new User(result.rows[0]);
    }
}