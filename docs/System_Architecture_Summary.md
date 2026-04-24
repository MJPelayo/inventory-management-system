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

---

## 📁 Module Structure

### Directory Tree

```
backend/src/
│
├── models/                    # Database models (15 files)
│   ├── User.js                # User accounts & authentication
│   ├── Product.js             # Product catalog management
│   ├── Inventory.js           # Stock level tracking
│   ├── Category.js            # Product categories (hierarchical)
│   ├── Supplier.js            # Supplier information
│   ├── Warehouse.js           # Warehouse locations
│   ├── SalesOrder.js          # Customer sales orders
│   ├── SupplyOrder.js         # Purchase orders to suppliers
│   ├── StockMovement.js       # Audit trail for stock changes
│   ├── AuditLog.js            # Security action logging
│   └── ...
│
├── controllers/               # Request handlers (11 files)
│   ├── authController.js      # Login, register, profile
│   ├── userController.js      # User CRUD operations
│   ├── productController.js   # Product management
│   ├── inventoryController.js # Stock operations
│   ├── orderController.js     # Sales & supply orders
│   ├── reportController.js    # Report generation
│   ├── exportController.js    # CSV data exports
│   └── ...
│
├── routes/                    # API endpoints (11 files)
│   ├── authRoutes.js          # /api/auth/*
│   ├── userRoutes.js          # /api/users/*
│   ├── productRoutes.js       # /api/products/*
│   ├── inventoryRoutes.js     # /api/inventory/*
│   ├── orderRoutes.js         # /api/orders/*
│   ├── reportRoutes.js        # /api/reports/*
│   ├── exportRoutes.js        # /api/export/*
│   └── ...
│
├── middleware/                # Custom middleware
│   └── auth.js                # JWT verification + RBAC
│
├── db/
│   └── pool.js                # PostgreSQL connection pool
│
├── app.js                     # Express application setup
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
│  • Attach decoded user info to req.user                         │
│  • Check token blacklist                                        │
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
| **product_requests** | `requested_by`, `approved_by` | `users` |

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

-- Product request indexes
CREATE INDEX idx_product_requests_status ON product_requests(status);
```

---

## 📋 Business Logic Rules

### Inventory Rules

| Rule ID | Description | Implementation |
|:--------|:------------|:---------------|
| **INV-01** | Stock quantities cannot go negative | CHECK constraint in database schema |
| **INV-02** | Every stock change requires a movement record | Trigger enforced in controller |
| **INV-03** | Low stock alert triggered when quantity ≤ reorder point | `getLowStock()` query method |
| **INV-04** | Adjustments marked `requires_approval` need admin authorization | `adjustStock()` permission check |

### Order Rules

| Rule ID | Description | Implementation |
|:--------|:------------|:---------------|
| **ORD-01** | Sales orders require sufficient stock availability | `reserveStock()` validation |
| **ORD-02** | Discounts greater than zero require approval | `requestDiscountApproval()` workflow |
| **ORD-03** | Cancelled orders should restore stock | *Not yet implemented* |
| **ORD-04** | Order numbers must be unique | `generateOrderNumber()` function |

### User Rules

| Rule ID | Description | Implementation |
|:--------|:------------|:---------------|
| **USR-01** | Email addresses must be unique | UNIQUE constraint in schema |
| **USR-02** | Passwords must be minimum 6 characters | `setPasswordHash()` validation |
| **USR-03** | Inactive users cannot login | `isActive()` check in authentication |

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
            iat: Date.now(), 
            jti: crypto.randomBytes(16).toString('hex') 
        },
        JWT_SECRET,
        { expiresIn: '24h', algorithm: 'HS256' }
    );
};
```

### Token Blacklisting

```javascript
// middleware/auth.js
const tokenBlacklist = new Map();

const revokeToken = (token) => {
    const decoded = jwt.decode(token);
    const ttl = (decoded.exp - Date.now() / 1000) * 1000;
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

### Paginated Response (Future Enhancement)

```json
{
    "success": true,
    "data": [...],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 100,
        "pages": 5
    }
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
| Total Models | 15 |
| Total Controllers | 11 |
| Total API Routes | 55 endpoints |
| Database Tables | 15 |
| ENUM Types | 4 (`user_role`, `order_status`, `payment_status`, `movement_type`) |
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