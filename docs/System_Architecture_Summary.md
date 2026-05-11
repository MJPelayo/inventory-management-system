# System Architecture Summary

## 📋 Technology Stack

| Layer | Technology | Version | Purpose |
|:------|:-----------|:--------|:--------|
| **Runtime** | Node.js | 16.x+ | JavaScript runtime environment |
| **Framework** | Express.js | 4.18.2 | Web application framework |
| **Database** | PostgreSQL | 14.x+ | Relational database management |
| **Authentication** | JWT + bcrypt | - | Secure token-based auth with password hashing |
| **Reports** | PDFKit | 0.14.0 | PDF document generation |
| **Export** | csv-writer | 1.6.0 | CSV data export functionality |

---

## 🏗️ Key Architectural Decisions

### 1. Product Has NO Stock — Inventory Handles ALL Stock

#### Why This Design?

| Reason | Explanation |
|:-------|:------------|
| **Separation of Concerns** | Products define catalog items; Inventory tracks physical stock levels |
| **Multi-Warehouse Support** | One product can exist across multiple warehouses with different quantities |
| **Complete Audit Trail** | Every stock movement is logged in the `stock_movements` table |
| **System Flexibility** | New warehouses can be added without modifying the Product table |

#### Database Implementation

**Product Table** (Catalog metadata only — no stock columns):

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL
    -- Note: NO quantity column here!
);
```

**Inventory Table** (Stock tracking per warehouse):

```sql
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    warehouse_id INTEGER REFERENCES warehouses(id),
    quantity INTEGER NOT NULL DEFAULT 0,
    reorder_point INTEGER DEFAULT 0,
    UNIQUE(product_id, warehouse_id)
);
```

#### Example Data

```sql
-- Single product catalog entry: Galaxy S23
INSERT INTO products (name, sku, price, cost) 
VALUES ('Galaxy S23', 'SAM-GS23', 999.99, 750.00);

-- Stock distribution across warehouses
INSERT INTO inventory (product_id, warehouse_id, quantity) 
VALUES 
    (1, 1, 25),   -- 25 units in Main Warehouse
    (1, 2, 10);   -- 10 units in North Warehouse
```

---

### 2. JWT Authentication with Role-Based Access Control

#### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOGIN PROCESS                             │
├─────────────────────────────────────────────────────────────────┤
│  1. Client → POST /api/auth/login                               │
│  2. Server: bcrypt.compare(password, hashed_password)           │
│  3. Server: jwt.sign({id, email, role}, JWT_SECRET)             │
│  4. Server → Client: { user, token }                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PROTECTED REQUESTS                            │
├─────────────────────────────────────────────────────────────────┤
│  5. Client: Authorization: Bearer <token>                       │
│  6. Server: authenticateToken() middleware verifies JWT         │
│  7. Server: req.user attached to request object                 │
│  8. Server: authorize('admin', 'sales') checks role permissions │
│  9. Server: Proceed to controller if authorized                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Security Features

| Feature | Implementation Details |
|:--------|:-----------------------|
| **Password Storage** | bcrypt hashing with 10 salt rounds |
| **Token Algorithm** | HS256 (explicitly specified) |
| **Token Expiry** | 24 hours from issuance |
| **Token Revocation** | Blacklist support for logout functionality |
| **Algorithm Security** | Protected against algorithm confusion attacks |
| **Input Validation** | All controllers validate incoming data |
| **Token Refresh** | Tokens can be refreshed within 1h of expiry or 5min after expiry |
| **Fine-Grained Permissions** | Module-level permissions (read/create/edit/delete/full) via [`permissions.js`](backend/src/middleware/permissions.js) |
| **Input Sanitization** | Global sanitization middleware via [`sanitize.js`](backend/src/middleware/sanitize.js) |
| **SQL Injection Protection** | Detection middleware via [`security.js`](backend/src/middleware/security.js) |

---

### 3. Order Processing with Inventory Integration

#### Sales Order Creation Flow

```javascript
// orderController.js - createSalesOrder()
async createSalesOrder(req, res) {
    const order = new SalesOrder({...});
    
    // Step 1: Reserve stock (reduces inventory)
    await order.reserveStock();
    
    // Step 2: Save order to database
    const saved = await order.save();
    
    // Step 3: Return order confirmation
    return saved;
}
```

#### reserveStock() Implementation

```javascript
async reserveStock() {
    await client.query('BEGIN');  // Start transaction
    
    for (const item of this.items) {
        // Check available stock
        const inventory = await client.query(
            'SELECT quantity FROM inventory WHERE product_id = $1',
            [item.product_id]
        );
        
        if (inventory.rows[0].quantity < item.quantity) {
            throw new Error('Insufficient stock');
        }
        
        // Reduce inventory quantity
        await client.query(
            'UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2',
            [item.quantity, item.product_id]
        );
        
        // Record stock movement for audit trail
        await client.query(
            `INSERT INTO stock_movements 
             (product_id, quantity_change, movement_type, reason) 
             VALUES ($1, -$2, 'sold', $3)`,
            [item.product_id, item.quantity, `Order ${this.order_number}`]
        );
    }
    
    await client.query('COMMIT');  // Commit transaction
}
```

---

### 4. Role-Based Access Control (RBAC)

#### Middleware Implementation

```javascript
// middleware/auth.js
const authorize = (...roles) => {
    return (req, res, next) => {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Check if user has required role
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `Access denied. ${req.user.role} cannot perform this action.`
            });
        }
        
        next();  // Proceed to controller
    };
};

// Usage in routes
router.get('/reports/sales', 
    authenticateToken, 
    authorize('admin', 'sales'), 
    reportController.getSalesReport
);
```

#### Fine-Grained Permissions

Beyond role-based access, the system supports module-level permissions managed via [`permissions.js`](backend/src/middleware/permissions.js):

| Permission Level | Actions Allowed |
|:-----------------|:----------------|
| `none` | No access |
| `read` | View only |
| `create` | View + Create |
| `edit` | View + Create + Edit |
| `delete` | View + Create + Edit + Delete |
| `full` | All actions + Manage permissions |

Permissions are checked via the [`requirePermission()`](backend/src/middleware/permissions.js:57) middleware and fall back to role-based defaults if no custom permission is set.

---

## 📁 Module Structure

### Directory Tree

```
backend/src/
│
├── models/                    # Database models (17 files)
│   ├── BaseModel.js           # Base class with shared CRUD operations
│   ├── User.js                # User accounts & authentication (extends BaseModel)
│   ├── Product.js             # Product catalog management (extends BaseModel)
│   ├── Supplier.js            # Supplier information (extends BaseModel)
│   ├── Inventory.js           # Stock level tracking (standalone)
│   ├── Category.js            # Product categories (hierarchical, standalone)
│   ├── Warehouse.js           # Warehouse locations (standalone)
│   ├── SalesOrder.js          # Customer sales orders (standalone)
│   ├── SupplyOrder.js         # Purchase orders to suppliers (standalone)
│   ├── StockMovement.js       # Audit trail for stock changes (standalone)
│   ├── AuditLog.js            # Security action logging (standalone)
│   ├── DeliveryType.js        # Delivery type dropdown data (standalone)
│   ├── OrderStatus.js         # Order status dropdown data (standalone)
│   ├── PaymentStatus.js       # Payment status dropdown data (standalone)
│   ├── PaymentTerm.js         # Payment term dropdown data (standalone)
│   ├── ShippingMethod.js      # Shipping method dropdown data (standalone)
│   └── UserRole.js            # Role definitions dropdown data (standalone)
│
├── controllers/               # Request handlers (19 files)
│   ├── authController.js      # Login, register, profile
│   ├── userController.js      # User CRUD operations
│   ├── productController.js   # Product management, bulk price updates
│   ├── categoryController.js  # Category CRUD, hierarchy tree
│   ├── supplierController.js  # Supplier CRUD
│   ├── warehouseController.js # Warehouse CRUD
│   ├── inventoryController.js # Stock receive/transfer/adjust, reorder suggestions
│   ├── inventoryReportController.js # Inventory report with CSV export
│   ├── orderController.js     # Sales & supply orders, discount workflow
│   ├── reportController.js    # Report generation (sales/inventory/supplier)
│   ├── exportController.js    # CSV data exports
│   ├── auditLogController.js  # Audit log retrieval
│   ├── dropdownController.js  # Dropdown master data aggregation
│   ├── paymentTermController.js # Payment terms management
│   ├── permissionController.js # Fine-grained permissions management
│   ├── settingsController.js  # System settings management
│   ├── messageController.js   # Internal messaging system
│   ├── requestController.js   # Cross-role requests (deletion, approvals)
│   └── notificationController.js # User notifications
│
├── routes/                    # API endpoints (18 files)
│   ├── authRoutes.js          # /api/auth/*
│   ├── userRoutes.js          # /api/users/*
│   ├── productRoutes.js       # /api/products/*
│   ├── categoryRoutes.js      # /api/categories/*
│   ├── supplierRoutes.js      # /api/suppliers/*
│   ├── warehouseRoutes.js     # /api/warehouses/*
│   ├── inventoryRoutes.js     # /api/inventory/*
│   ├── orderRoutes.js         # /api/orders/*
│   ├── reportRoutes.js        # /api/reports/*
│   ├── exportRoutes.js        # /api/export/*
│   ├── auditLogRoutes.js      # /api/audit-logs/*
│   ├── dropdownRoutes.js      # /api/dropdowns/*
│   ├── paymentTermRoutes.js   # /api/payment-terms/*
│   ├── permissionRoutes.js    # /api/permissions/*
│   ├── settingsRoutes.js      # /api/settings/*
│   ├── messageRoutes.js       # /api/messages/*
│   ├── requestRoutes.js       # /api/requests/*
│   └── notificationRoutes.js  # /api/notifications/*
│
├── middleware/                # Custom middleware (4 files)
│   ├── auth.js                # JWT verification, RBAC, token blacklist/refresh
│   ├── permissions.js         # Fine-grained module-level permissions
│   ├── sanitize.js            # Input sanitization middleware
│   └── security.js            # SQL injection detection middleware
│
├── db/                        # Database layer (2 files)
│   ├── pool.js                # PostgreSQL connection pool (singleton)
│   └── queryBuilder.js        # Query builder utility
│
├── app.js                     # Express application setup, route mounting
└── server.js                  # Application entry point
```

---

## 🔄 Data Flow Diagrams

### 1. Request-Response Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│                      (Browser / Mobile App)                      │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP Request (JSON)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: Express App (app.js)                                  │
│  • CORS handling                                                │
│  • JSON body parser                                             │
│  • URL-encoded parser                                           │
│  • SQL injection protection middleware                          │
│  • Input sanitization middleware                                │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: Route Matching (routes/*.js)                          │
│  • Public routes (no authentication required)                   │
│  • Protected routes (with authenticateToken middleware)         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: Authentication Middleware (auth.js)                   │
│  • Extract Bearer token from Authorization header               │
│  • Verify JWT signature and expiration                          │
│  • Check token blacklist                                        │
│  • Attach decoded user info to req.user                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 4: Authorization Middleware (auth.js)                    │
│  • Check user role against allowed roles for endpoint           │
│  • Return 403 Forbidden if insufficient permissions             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 5: Controller (controllers/*.js)                         │
│  • Parse request body and parameters                            │
│  • Call appropriate model methods                               │
│  • Format and send response                                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 6: Model (models/*.js)                                   │
│  • Execute parameterized database queries                       │
│  • Apply business logic rules                                   │
│  • Return data to controller                                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 7: Database (PostgreSQL via pg pool)                     │
│  • Execute SQL queries                                          │
│  • Return result rows                                           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         RESPONSE                                 │
│                    Client receives JSON data                     │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. Database Connection Pool Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION STARTUP                           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  pool.js - Connection Pool Configuration                        │
│  ─────────────────────────────────────────────────────────────  │
│  const pool = new Pool({                                        │
│    user: process.env.DB_USER,                                   │
│    host: process.env.DB_HOST,                                   │
│    database: process.env.DB_NAME,                               │
│    password: process.env.DB_PASSWORD,                           │
│    port: process.env.DB_PORT,                                   │
│    max: 20,              ← Maximum connections                  │
│    idleTimeoutMillis: 30000,                                    │
│    connectionTimeoutMillis: 2000                                │
│  });                                                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONNECTION POOL                               │
│              (Maximum 20 concurrent connections)                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ Conn 1 │ │ Conn 2 │ │ Conn 3 │ │  ...   │ │ Conn 20│       │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  MODEL QUERY EXECUTION                                          │
│  ─────────────────────────                                      │
│  const client = await pool.connect();  ← Acquire connection     │
│  try {                                                          │
│    const result = await client.query(sql, params);              │
│  } finally {                                                    │
│    client.release();  ← Return connection to pool               │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Relationships

### Entity Relationship Summary

| Entity | Foreign Keys | Related Tables |
|:-------|:-------------|:---------------|
| **users** | `warehouse_id` | `warehouses` |
| **products** | `category_id`, `supplier_id` | `categories`, `suppliers` |
| **inventory** | `product_id`, `warehouse_id` | `products`, `warehouses` |
| **product_locations** | `product_id`, `warehouse_id` | `products`, `warehouses` |
| **sales_orders** | `created_by`, `discount_approved_by` | `users` |
| **supply_orders** | `supplier_id`, `created_by` | `suppliers`, `users` |
| **order_items** | `order_id`, `product_id` | `sales_orders/supply_orders`, `products` |
| **stock_movements** | `product_id`, `warehouse_id`, `performed_by` | `products`, `warehouses`, `users` |
| **audit_logs** | `user_id` | `users` |
| **discount_approvals** | `order_id`, `requested_by`, `approved_by` | `sales_orders`, `users` |
| **internal_messages** | `sender_id`, `recipient_id` | `users` |
| **internal_requests** | `requested_by`, `resolved_by` | `users` |
| **notifications** | `user_id` | `users` |
| **user_permissions** | `user_id` | `users` |
| **permission_audit_log** | `changed_by` | `users` |
| **role_default_permissions** | — | `user_roles` |

### Index Strategy for Performance

```sql
-- User & Authentication indexes
CREATE INDEX idx_users_email ON users(email);

-- Product indexes
CREATE INDEX idx_products_sku ON products(sku);

-- Inventory indexes (critical for stock queries)
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id);

-- Order indexes
CREATE INDEX idx_sales_orders_status ON sales_orders(status);

-- Stock movement indexes (for audit trail queries)
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_timestamp ON stock_movements(created_at);

-- Audit log indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
```

---

## 📋 Business Logic Rules

### Inventory Rules

| Rule ID | Description | Implementation |
|:--------|:------------|:---------------|
| **INV-01** | Stock quantities cannot go negative | CHECK constraint in database schema |
| **INV-02** | Every stock change requires a movement record | Trigger enforced in controller |
| **INV-03** | Low stock alert triggered when quantity ≤ reorder point | [`getLowStock()`](backend/src/models/Inventory.js:82) query method |
| **INV-04** | Adjustments marked `requires_approval` need admin authorization | [`adjustStock()`](backend/src/controllers/inventoryController.js:205) permission check |
| **INV-05** | Transfers require sufficient source stock | [`transferStock()`](backend/src/controllers/inventoryController.js:144) validation |

### Order Rules

| Rule ID | Description | Implementation |
|:--------|:------------|:---------------|
| **ORD-01** | Sales orders require sufficient stock availability | [`reserveStock()`](backend/src/models/SalesOrder.js:38) validation |
| **ORD-02** | Discounts greater than zero require approval | [`requestDiscountApproval()`](backend/src/controllers/orderController.js:123) workflow |
| **ORD-03** | Cancelled orders should restore stock | *Not yet implemented* |
| **ORD-04** | Order numbers must be unique | [`generateOrderNumber()`](backend/src/models/SalesOrder.js:27) function |

### User Rules

| Rule ID | Description | Implementation |
|:--------|:------------|:---------------|
| **USR-01** | Email addresses must be unique | UNIQUE constraint in schema |
| **USR-02** | Passwords must be minimum 6 characters | [`setPasswordHash()`](backend/src/models/User.js:47) validation |
| **USR-03** | Inactive users cannot login | [`isActive()`](backend/src/models/User.js:28) check in authentication |
| **USR-04** | Protected accounts cannot be deleted by others | [`canDeleteUser()`](backend/src/middleware/permissions.js:83) check |

---

## 🔒 Security Implementation

### Password Hashing

```javascript
// authController.js - User Registration
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// authController.js - User Login
const isPasswordValid = await bcrypt.compare(password, user.getPasswordHash());
```

### JWT Token Generation

```javascript
// middleware/auth.js
const generateToken = (userId, email, role) => {
    return jwt.sign(
        { 
            id: userId, 
            email, 
            role, 
            iat: Math.floor(Date.now() / 1000), 
            jti: crypto.randomBytes(16).toString('hex') 
        },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h', algorithm: 'HS256' }
    );
};
```

### Token Blacklisting

```javascript
// middleware/auth.js
const tokenBlacklist = new Map();

const blacklistToken = (token, ttl) => {
    tokenBlacklist.set(token, Date.now() + ttl);
};

const isTokenBlacklisted = (token) => {
    const expiry = tokenBlacklist.get(token);
    return expiry && expiry > Date.now();
};
```

### SQL Injection Prevention

All database queries use parameterized statements:

```javascript
// ✅ CORRECT - Parameterized query (safe)
await pool.query('SELECT * FROM users WHERE email = $1', [email]);

// ❌ WRONG - String concatenation (vulnerable - NEVER use)
// await pool.query(`SELECT * FROM users WHERE email = '${email}'`);
```

Additional protection via [`sqlInjectionProtection`](backend/src/middleware/security.js) middleware that detects common SQL injection patterns in request bodies and query parameters.

---

## 📤 API Response Format

### Success Response

```json
{
    "success": true,
    "data": { ... },
    "message": "Optional success message",
    "count": 42
}
```

### Error Response

```json
{
    "success": false,
    "error": "Descriptive error message"
}
```

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|:---------|:--------:|:--------|:------------|
| `DB_HOST` | Yes | localhost | PostgreSQL server hostname |
| `DB_PORT` | Yes | 5432 | PostgreSQL server port |
| `DB_USER` | Yes | postgres | Database username |
| `DB_PASSWORD` | Yes | — | Database password |
| `DB_NAME` | Yes | inventory_db | Database name |
| `PORT` | No | 3000 | API server listening port |
| `NODE_ENV` | No | development | Runtime environment |
| `JWT_SECRET` | Yes | — | JWT signing secret (minimum 32 characters) |
| `JWT_EXPIRE` | No | 24h | Token expiration duration |

---

## 📜 NPM Scripts

| Command | Description |
|:--------|:------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with auto-restart (nodemon) |
| `npm run show-creds` | Display all system user credentials |
| `npm run reset-password` | Reset a user's password |
| `npm run db:init` | Initialize database from schema.sql |
| `npm test` | Run Jest test suite |

---

## 📊 System Metrics

| Metric | Count |
|:-------|:------|
| Total Models | 17 |
| Total Controllers | 19 |
| Total Route Files | 18 |
| Total API Endpoints | 95 |
| Database Tables | 27 |
| Middleware Files | 4 |
| Database Indexes | 12+ |
| Triggers | 8 (updated_at timestamps) |

---

## 🚀 Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `JWT_SECRET` (32+ random characters)
- [ ] Configure PostgreSQL with secure credentials
- [ ] Run database migrations (`schema.sql`)
- [ ] Install production dependencies only (`npm ci --production`)
- [ ] Set up process manager (PM2 or systemd)
- [ ] Configure reverse proxy (Nginx)
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Set up automated database backups
- [ ] Configure logging and monitoring solutions