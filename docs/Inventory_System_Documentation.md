# 📦 Inventory Management System — Complete Documentation

> **Production-Ready Backend API** for managing products, inventory, orders, and reports across multiple warehouses.

---

## 📑 Table of Contents

| # | Section | Quick Link |
|---|---------|------------|
| 1 | [System Overview](#system-overview) | Architecture, tech stack, core principles |
| 2 | [How to Run the Program](#how-to-run-the-program) | Step-by-step setup guide |
| 3 | [System Architecture](#system-architecture) | Layered design & components |
| 4 | [Class Structure](#class-structure) | Models, controllers, middleware |
| 5 | [User Panels & RBAC](#user-panels--rbac) | Role permissions matrix |
| 6 | [Logic Flow Examples](#logic-flow-examples) | Visual workflow diagrams |
| 7 | [Key Design Patterns](#key-design-patterns) | Patterns used in codebase |
| 8 | [Data Flow & Relationships](#data-flow--relationships) | ERD & entity relationships |
| 9 | [API Endpoints Reference](#api-endpoints-reference) | All 55 endpoints summarized |
| 10 | [Database Tables](#database-tables) | 15 tables overview |
| 11 | [Troubleshooting](#troubleshooting) | Common issues & fixes |

---

## System Overview

### 🛠️ Technology Stack

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Express.js    │────►│   PostgreSQL    │────►│   JWT + bcrypt  │
│  (API Layer)    │     │  (Data Store)   │     │ (Authentication)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
       │                        │                        │
       ▼                        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    PDFKit       │     │   CSV Writer    │     │   Node.js 16+   │
│ (PDF Reports)   │     │  (Data Export)  │     │  (Runtime)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

| Component | Technology | Purpose |
|-----------|------------|---------|
| **API Framework** | Node.js + Express | RESTful API layer |
| **Database** | PostgreSQL 14+ | Relational data persistence |
| **Authentication** | JWT + bcrypt | Secure token-based auth with password hashing |
| **Reports** | PDFKit | PDF report generation |
| **Export** | CSV Writer | Data export functionality |

### 🔑 Key Architectural Principles

| Principle | How It's Applied |
|-----------|-----------------|
| **Separation of Concerns** | Code organized into Models, Controllers, Routes, and Middleware |
| **Encapsulation** | All inventory changes recorded through [`StockMovement`](../backend/src/models/StockMovement.js) model |
| **Composition over Inheritance** | Orders compose OrderItems; Inventory references Products |
| **Dependency Injection** | Database connection pool injected into all models |

### ⚡ Core Business Rule

> ### 🚫 Products do NOT track stock — Inventory tracks stock

**Why this matters:**

| Benefit | Explanation |
|---------|-------------|
| ✅ Multi-Warehouse | One product exists in many warehouses with different quantities |
| ✅ Full Audit Trail | Every stock change is logged via [`StockMovement`](../backend/src/models/StockMovement.js) |
| ✅ Clear Ownership | Warehouse managers control inventory, not product catalog |

---

## How to Run the Program

### 📋 Prerequisites

| Requirement | Minimum Version |
|-------------|-----------------|
| Node.js | 16.x |
| PostgreSQL | 14.x |
| npm | 8.x |

---

### 🚀 Quick Start (4 Steps)

#### Step 1: Database Setup

**Option A — Manual (pgAdmin4):**

```sql
-- Create the database
CREATE DATABASE inventory_db;

-- Then run the schema
-- Open pgAdmin4 → Query Tool → Paste entire database/schema.sql → Press F5
```

**Option B — Automated Script:**

```bash
cd backend
node scripts/quick-reset.js
```

> ⚠️ **Warning:** The reset script drops and recreates all tables. All existing data will be lost.

---

#### Step 2: Environment Configuration

Create a `.env` file inside the `backend` folder:

```env
# ─── Database Configuration ───
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=inventory_db

# ─── Server Configuration ───
PORT=3000
NODE_ENV=development

# ─── JWT Configuration (REQUIRED — 32+ characters) ───
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRE=24h
```

> 💡 **Generate a secure JWT_SECRET:**
> ```powershell
> # Windows PowerShell
> [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString()))
> ```

---

#### Step 3: Install Dependencies

```bash
cd backend
npm install
```

---

#### Step 4: Start the Server

```bash
# Development mode (auto-restarts on file changes)
npm run dev

# Production mode
npm start
```

**Server runs at:** `http://localhost:3000`

---

### 🔑 Sample Login Credentials

Auto-created on first startup:

| Role | Email | Password |
|:----:|-------|----------|
| 👑 **Admin** | `admin@ims.com` | `admin123` |
| 🛒 **Sales** | `sales@ims.com` | `sales123` |
| 🏭 **Warehouse** | `warehouse@ims.com` | `warehouse123` |
| 📦 **Supply** | `supply@ims.com` | `supply123` |

**Helpful Commands:**

```bash
# View all credentials anytime
npm run show-creds

# Reset a forgotten password
npm run reset-password admin@ims.com admin123
```

---

## System Architecture

### 🏗️ High-Level Architecture

```
╔═══════════════════════════════════════════════════════════════════╗
║                      CLIENT LAYER                                 ║
║  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            ║
║  │  Admin   │ │  Sales   │ │Warehouse │ │  Supply  │            ║
║  │ Browser  │ │ Browser  │ │ Browser  │ │ Browser  │            ║
║  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘            ║
║       └─────────────┴────────────┴────────────┘                  ║
║                          │                                       ║
║                    HTTPS / JSON                                   ║
║                          ▼                                       ║
╠═══════════════════════════════════════════════════════════════════╣
║                   API LAYER (Express.js)                          ║
║  ┌───────────────────────────────────────────────────────────┐   ║
║  │                     REST Endpoints                         │   ║
║  │  /api/auth    /api/users    /api/products                  │   ║
║  │  /api/inventory  /api/orders  /api/reports                 │   ║
║  │  /api/export    /api/categories  /api/suppliers            │   ║
║  └───────────────────────────────────────────────────────────┘   ║
║                          │                                       ║
║                          ▼                                       ║
╠═══════════════════════════════════════════════════════════════════╣
║                   MIDDLEWARE LAYER                                ║
║  ┌───────────────────────────────────────────────────────────┐   ║
║  │  • JWT Authentication         • Role-Based Access Control  │   ║
║  │  • Token Blacklisting          • CORS                       │   ║
║  │  • JSON Body Parser           • Error Handling              │   ║
║  └───────────────────────────────────────────────────────────┘   ║
║                          │                                       ║
║                          ▼                                       ║
╠═══════════════════════════════════════════════════════════════════╣
║                    DATABASE LAYER                                  ║
║  ┌───────────────────────────────────────────────────────────┐   ║
║  │                     PostgreSQL                              │   ║
║  │  15 Tables: users, products, inventory, warehouses,        │   ║
║  │  suppliers, categories, orders, movements, logs, etc.      │   ║
║  └───────────────────────────────────────────────────────────┘   ║
╚═══════════════════════════════════════════════════════════════════╝
```

### 📂 Core Layers

| Layer | Files | Responsibility |
|:------|-------|----------------|
| **Routes** | [`routes/*.js`](../backend/src/routes/) | Define API endpoints, attach middleware |
| **Controllers** | [`controllers/*.js`](../backend/src/controllers/) | Handle HTTP requests/responses, orchestrate business logic |
| **Models** | [`models/*.js`](../backend/src/models/) | Business logic, database queries, data validation |
| **Middleware** | [`middleware/auth.js`](../backend/src/middleware/auth.js) | JWT verification, role authorization, token blacklisting |
| **Database** | [`db/pool.js`](../backend/src/db/pool.js) | PostgreSQL connection pool (singleton) |

---

## Class Structure

### 📦 Model Classes (15 Models)

| Model | File | Purpose |
|:------|------|---------|
| **User** | [`User.js`](../backend/src/models/User.js) | User accounts, authentication, RBAC |
| **Product** | [`Product.js`](../backend/src/models/Product.js) | Product catalog metadata (NO stock) |
| **Inventory** | [`Inventory.js`](../backend/src/models/Inventory.js) | Stock levels per warehouse |
| **Category** | [`Category.js`](../backend/src/models/Category.js) | Hierarchical product categories |
| **Supplier** | [`Supplier.js`](../backend/src/models/Supplier.js) | Supplier information & performance |
| **Warehouse** | [`Warehouse.js`](../backend/src/models/Warehouse.js) | Warehouse locations & capacity |
| **SalesOrder** | [`SalesOrder.js`](../backend/src/models/SalesOrder.js) | Customer sales orders |
| **SupplyOrder** | [`SupplyOrder.js`](../backend/src/models/SupplyOrder.js) | Purchase orders from suppliers |
| **StockMovement** | [`StockMovement.js`](../backend/src/models/StockMovement.js) | Audit trail for all stock changes |
| **AuditLog** | [`AuditLog.js`](../backend/src/models/AuditLog.js) | Security & action logging |
| **ProductLocation** | *(schema only)* | Physical storage details (aisle/shelf/layer) |
| **DiscountApproval** | *(schema + controller)* | Discount approval workflow |
| **ProductRequest** | *(schema only)* | Sales → Supply product requests |
| **AdjustmentReason** | *(schema only)* | Stock adjustment reason codes |
| **OrderItem** | *(embedded in Order models)* | Line items within orders |

### 🎮 Controller Classes (11 Controllers)

| Controller | File | Responsibility |
|:-----------|------|----------------|
| **authController** | [`authController.js`](../backend/src/controllers/authController.js) | Login, register, user profile |
| **userController** | [`userController.js`](../backend/src/controllers/userController.js) | User CRUD operations |
| **productController** | [`productController.js`](../backend/src/controllers/productController.js) | Product CRUD, bulk price updates |
| **categoryController** | [`categoryController.js`](../backend/src/controllers/categoryController.js) | Category CRUD, hierarchy tree |
| **supplierController** | [`supplierController.js`](../backend/src/controllers/supplierController.js) | Supplier CRUD |
| **warehouseController** | [`warehouseController.js`](../backend/src/controllers/warehouseController.js) | Warehouse CRUD |
| **inventoryController** | [`inventoryController.js`](../backend/src/controllers/inventoryController.js) | Stock receive/transfer/adjust, reorder suggestions |
| **orderController** | [`orderController.js`](../backend/src/controllers/orderController.js) | Sales & supply orders, discount workflow |
| **reportController** | [`reportController.js`](../backend/src/controllers/reportController.js) | Sales, inventory, supplier reports |
| **exportController** | [`exportController.js`](../backend/src/controllers/exportController.js) | CSV data exports |
| **warehouseController** | [`warehouseController.js`](../backend/src/controllers/warehouseController.js) | Warehouse management |

### 🛡️ Middleware

| Function | File | Purpose |
|:---------|------|---------|
| **authenticateToken** | [`auth.js`](../backend/src/middleware/auth.js) | Verify JWT, attach decoded user to request |
| **authorize** | [`auth.js`](../backend/src/middleware/auth.js) | Role-based access control guard |
| **optionalAuth** | [`auth.js`](../backend/src/middleware/auth.js) | Optional authentication for public+protected routes |
| **revokeToken** | [`auth.js`](../backend/src/middleware/auth.js) | Token blacklisting on logout |

---

## User Panels & RBAC

### 🔐 Role-Based Access Control Matrix

| Permission | 👑 Admin | 🛒 Sales | 🏭 Warehouse | 📦 Supply |
|:-----------|:--------:|:--------:|:------------:|:---------:|
| View own profile | ✅ | ✅ | ✅ | ✅ |
| Edit own profile | ✅ | ✅ | ✅ | ✅ |
| View all users | ✅ | ❌ | ❌ | ❌ |
| Create/Edit/Delete users | ✅ | ❌ | ❌ | ❌ |
| View products | ✅ | ✅ | ✅ | ✅ |
| Create/Edit/Delete products | ✅ | ❌ | ❌ | ❌ |
| Bulk price update | ✅ | ❌ | ❌ | ❌ |
| View inventory | ✅ | ✅ | ✅ | ✅ |
| Receive stock | ✅ | ❌ | ✅ | ❌ |
| Transfer stock | ✅ | ❌ | ✅ | ❌ |
| Adjust stock | ✅ | ❌ | ✅ | ❌ |
| Create sales orders | ✅ | ✅ | ❌ | ❌ |
| Request discount | ✅ | ✅ | ❌ | ❌ |
| Approve discount | ✅ | ❌ | ❌ | ❌ |
| Create supply orders | ✅ | ❌ | ❌ | ✅ |
| Manage suppliers | ✅ | ❌ | ❌ | ✅ |
| View sales reports | ✅ | ✅ | ❌ | ❌ |
| View inventory reports | ✅ | ❌ | ✅ | ❌ |
| View supplier reports | ✅ | ❌ | ❌ | ✅ |
| Export data (CSV) | ✅ | ❌ | ❌ | ❌ |

---

## Logic Flow Examples

### 1️⃣ Sales Order Processing Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Sales   │────►│   API Route  │────►│   Controller │────►│    Model      │
│  User    │     │ /api/orders  │     │ orderCtrl    │     │ SalesOrder    │
└──────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                    │
               ┌────────────────────────────────────────────────────┤
               │                                                    ▼
               │                                         ┌──────────────────┐
               │                                         │  Validate &      │
               │  ┌──────────────────┐  ┌───────────────►│  1. Check stock  │
               │  │  Middleware      │  │                │  2. Deduct inv.  │
               │  │  • Auth JWT      │  │                │  3. Record move  │
               │  │  • Check role    │  │                │  4. Insert order │
               │  └──────────────────┘  │                └────────┬─────────┘
               │                        │                         │
               │                        │                    ┌────▼────┐
               │                        │                    │PostgreSQL│
               └────────────────────────┴────────────────────┼─────────┤
                                                             │ INSERT  │
                                                             │ UPDATE  │
                                                             └─────────┘
```

**Step-by-Step Breakdown:**

| Step | Action | Component |
|:----:|--------|-----------|
| 1 | Client sends POST `/api/orders/sales` with order data | HTTP Client |
| 2 | JWT token validated, user role checked | [`authenticateToken`](../backend/src/middleware/auth.js) |
| 3 | Order items validated (product exists, sufficient stock) | [`orderController`](../backend/src/controllers/orderController.js) |
| 4 | Inventory quantities deducted | [`Inventory`](../backend/src/models/Inventory.js) |
| 5 | Stock movement recorded as `'sold'` | [`StockMovement`](../backend/src/models/StockMovement.js) |
| 6 | Sales order persisted to database | [`SalesOrder`](../backend/src/models/SalesOrder.js) |
| 7 | Response returned with order details | HTTP Response |

---

### 2️⃣ Inventory Movement Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    All Inventory Operations                          │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│  Receive     │  Transfer    │  Adjust      │  Sold (via Order)      │
├──────────────┼──────────────┼──────────────┼────────────────────────┤
│ +quantity    │ From WH: -N  │ +/- manual   │ -quantity              │
│ type:'recv'  │ To WH:   +N  │ type:'adj'   │ type:'sold'            │
│ By: WH/Admin │ type:'trans'│ By: WH/Admin │ Auto on order create   │
└──────┬───────┴──────┬───────┴──────┬───────┴───────────┬────────────┘
       │              │              │                   │
       └──────────────┴──────────────┴───────────────────┘
                              │
                              ▼
              ┌───────────────────────────────────┐
              │  INSERT INTO stock_movements       │
              │  (product_id, quantity_change,     │
              │   movement_type, warehouse_id,     │
              │   performed_by, reason)            │
              └───────────────────────────────────┘
```

---

### 3️⃣ Authentication & Authorization Flow

```
┌─────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│ Client  │────►│ POST         │────►│ Validate     │────►│ Generate │
│         │     │ /auth/login  │     │ credentials  │     │ JWT      │
└─────────┘     └──────────────┘     └──────────────┘     └────┬─────┘
                                                                   │
              ┌────────────────────────────────────────────────────┤
              │                                                    ▼
              │                                          ┌─────────────────┐
              │  ┌──────────────────┐  ┌────────────────►│ 1. Find user   │
              │  │ Subsequent       │  │                 │    by email     │
              │  │ Requests         │  │                 │ 2. Compare      │
              │  │ Include:         │  │                 │    bcrypt hash  │
              │  │ Authorization:   │  │                 │ 3. Sign JWT     │
              │  │ Bearer <token>   │  │                 │ 4. Return token │
              │  └──────────────────┘  │                 └────────┬────────┘
              │                        │                          │
              │                 ┌──────▼──────┐              ┌────▼────┐
              │                 │ Blacklisted?│              │PostgreSQL│
              │                 │ if yes → 403│              │ SELECT   │
              │                 └─────────────┘              └─────────┘
              └─────────────────────────────────────────────────────────┘
```

---

### 4️⃣ Auto-Reorder Suggestion Flow

```
┌─────────────────────────────────────────────────────────────────┐
│               Auto-Reorder Algorithm                             │
│                                                                  │
│  FOR EACH product IN inventory:                                  │
│  │                                                                │
│  │  ├─ Step 1: Calculate sales_velocity                          │
│  │  │    (units sold in last 30 days / 30)                       │
│  │  │                                                             │
│  │  ├─ Step 2: Calculate days_of_stock                           │
│  │  │    (current_quantity / daily_sales_velocity)               │
│  │  │                                                             │
│  │  ├─ Step 3: Get supplier lead_time                            │
│  │  │    (from supplier record)                                  │
│  │  │                                                             │
│  │  └─ Step 4: IF days_of_stock < (lead_time + safety_buffer)    │
│  │       │                                                        │
│  │       └─► ADD to reorder suggestions list                     │
│  │             • product_name                                    │
│  │             • current_quantity                                │
│  │             • suggested_order_qty                             │
│  │             • supplier_name                                   │
│  │                                                                  │
│  RETURN suggestions sorted by urgency (lowest days_of_stock first)│
└─────────────────────────────────────────────────────────────────┘
```

---

### 5️⃣ Discount Approval Workflow

```
┌──────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Sales   │────►│ POST /orders/:id │────►│ Discount Request  │
│  User    │     │ /discount-request│     │ Status: PENDING  │
└──────────┘     └──────────────────┘     └────────┬─────────┘
                                                    │
                                                    ▼
                                           ┌──────────────────┐
                                           │   Admin Reviews   │
                                           │                   │
                                           │ PUT /orders/:id   │
                                           │ /discount-approve │
                                           └────────┬─────────┘
                                                    │
                                           ┌────────┴────────┐
                                           │                 │
                                           ▼                 ▼
                                    ┌──────────────┐   ┌──────────────┐
                                    │  APPROVE      │   │   REJECT      │
                                    │ approve:true  │   │ approve:false │
                                    └──────┬───────┘   └──────┬───────┘
                                           │                  │
                                           ▼                  ▼
                                    ┌──────────────┐   ┌──────────────┐
                                    │ Status:      │   │ Status:      │
                                    │ APPROVED     │   │ REJECTED     │
                                    │              │   │              │
                                    │ Discount     │   │ Original     │
                                    │ applied to   │   │ prices       │
                                    │ order total  │   │ retained     │
                                    └──────────────┘   └──────────────┘
```

---

## Key Design Patterns

### 1. Middleware Pattern — JWT Authentication

**Purpose:** Intercept requests, validate tokens, attach user context.

```javascript
// middleware/auth.js
const authenticateToken = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token required' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.id);
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};
```

| Aspect | Detail |
|--------|--------|
| **Where Used** | Every protected route |
| **What It Does** | Extracts JWT from header, verifies signature, loads user |
| **On Failure** | Returns 401 (no token) or 403 (invalid token) |

---

### 2. Repository Pattern — Database Models

**Purpose:** Encapsulate all database access behind clean static methods.

```javascript
// models/User.js
class User {
    static async findById(id) { /* ... */ }
    static async findByEmail(email) { /* ... */ }
    static async findAll(filters) { /* ... */ }
    static async deleteById(id) { /* ... */ }
    async save() { /* ... */ }
}
```

| Aspect | Detail |
|--------|--------|
| **Where Used** | All model files in [`models/`](../backend/src/models/) |
| **What It Does** | Provides consistent CRUD interface for each entity |
| **Benefit** | Controllers never write raw SQL — they call model methods |

---

### 3. Factory Pattern — Token Generation

**Purpose:** Create JWT tokens with standardized payload and expiration.

```javascript
// middleware/auth.js
const generateToken = (userId, email, role) => {
    return jwt.sign({ id: userId, email, role }, JWT_SECRET, {
        expiresIn: '24h'
    });
};
```

| Aspect | Detail |
|--------|--------|
| **Where Used** | Login and registration flows |
| **Payload** | User ID, email, role |
| **Expiration** | 24 hours (configurable via `JWT_EXPIRE`) |

---

### 4. Strategy Pattern — Role-Based Authorization

**Purpose:** Flexible permission checking based on user roles.

```javascript
// middleware/auth.js
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    };
};

// Usage in routes
router.get('/reports/sales',
    authenticateToken,
    authorize('admin', 'sales'),
    reportController.getSalesReport
);
```

| Aspect | Detail |
|--------|--------|
| **Where Used** | Route definitions in [`routes/*.js`](../backend/src/routes/) |
| **What It Does** | Higher-order function that returns role-specific middleware |
| **Benefit** | Composable — chain multiple strategies easily |

---

### 5. Singleton Pattern — Database Connection Pool

**Purpose:** Single shared connection pool across the entire application.

```javascript
// db/pool.js
const { Pool } = require('pg');
const pool = new Pool({ /* config */ });  // Created once
module.exports = pool;                     // Same instance everywhere
```

| Aspect | Detail |
|--------|--------|
| **Where Used** | [`db/pool.js`](../backend/src/db/pool.js) imported by all models |
| **What It Does** | Maintains reusable connections to PostgreSQL |
| **Benefit** | No connection overhead per request; efficient resource usage |

---

## Data Flow & Relationships

### 🗺️ Entity Relationship Diagram

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    users     │         │   products   │         │  categories  │
├──────────────┤         ├──────────────┤         ├──────────────┤
│ ★ id (PK)    │         │ ★ id (PK)    │         │ ★ id (PK)    │
│  name        │         │  name        │         │  name        │
│  email (UK)  │         │  sku (UK)    │────────►│  parent_id   │
│  password    │         │  price       │         │  description │
│  role        │         │  cost        │         └──────────────┘
└──────┬───────┘         │  category_id │
       │                 │  supplier_id ├──────────────┐
       │                 └──────────────┘              │
       │                                                │
       ▼                                                ▼
┌──────────────┐         ┌──────────────┐     ┌────────────────┐
│ sales_orders │         │  inventory   │     │   suppliers    │
├──────────────┤         ├──────────────┤     ├────────────────┤
│ ★ id (PK)    │         │ ★ id (PK)    │     │ ★ id (PK)      │
│  order_number│         │  product_id  ├─────►│  name          │
│  customer_*  │         │  warehouse_id│─────►│  contact_info  │
│  total_amount│         │  quantity    │     │  rating        │
│  status      │         │  reorder_pt  │     └────────────────┘
│  created_by ─┼────────►└──────────────┘
└──────┬───────┘                  │
       │                          │
       ▼                          ▼
┌──────────────┐         ┌──────────────┐
│ order_items  │         │  warehouses  │
├──────────────┤         ├──────────────┤
│ ★ id (PK)    │         │ ★ id (PK)    │
│  order_id ───┼────────►│  name        │
│  product_id ─┼────────►│  location    │
│  quantity    │         │  capacity    │
│  unit_price  │         │  is_active   │
└──────────────┘         └──────────────┘
```

### 🔗 Product ↔ Inventory Relationship (CRITICAL)

| Aspect | Product | Inventory |
|:-------|---------|-----------|
| **Purpose** | Catalog information (what we sell) | Stock tracking (how much we have) |
| **Contains** | Name, SKU, price, cost, category | Quantity, warehouse, reorder point |
| **Cardinality** | One product record | Many records per product (one per warehouse) |
| **Example** | "Galaxy S23" (single record) | 25 units in Main WH, 10 units in North WH |

```sql
-- Product table (catalog only — NO quantity)
INSERT INTO products (name, sku, price, cost)
VALUES ('Galaxy S23', 'SAM-GS23', 999.99, 750.00);

-- Inventory table (stock per warehouse)
INSERT INTO inventory (product_id, warehouse_id, quantity)
VALUES (1, 1, 25),   -- 25 units in Warehouse #1
       (1, 2, 10);   -- 10 units in Warehouse #2
```

### 📊 Order ↔ Inventory Relationship

| Operation | Effect on Inventory | Movement Type | Who Can Perform |
|:----------|:--------------------|:--------------|:----------------|
| **Sales Order** | Decrease quantity | `'sold'` | Admin, Sales |
| **Supply Order Receive** | Increase quantity | `'received'` | Admin, Warehouse |
| **Stock Transfer** | Decrease source, Increase destination | `'transferred'` | Admin, Warehouse |
| **Stock Adjustment** | +/- quantity | `'adjusted'` | Admin, Warehouse |

---

## API Endpoints Reference

> **Total: 55 endpoints** | **Base URL:** `http://localhost:3000`

For detailed curl examples for every endpoint, see [`API_Endpoints_Reference.md`](./API_Endpoints_Reference.md).

### 🔓 Public Endpoints (No Authentication)

| Method | Endpoint | Description |
|:------:|----------|-------------|
| GET | `/api/health` | Server health check |
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT token |

### 🔒 Protected Endpoints (JWT Required)

#### Authentication

| Method | Endpoint | Description |
|:------:|----------|-------------|
| GET | `/api/auth/me` | Get current authenticated user |

#### Users 👑 (Admin Only)

| Method | Endpoint | Description |
|:------:|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users` | Create new user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

#### Products 📦

| Method | Endpoint | Description |
|:------:|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get product by ID |
| GET | `/api/products/low-stock` | Get low-stock products |
| POST | `/api/products` | Create new product |
| PUT | `/api/products/:id` | Update product |
| PUT | `/api/products/bulk-price` | Bulk update prices 👑 |
| DELETE | `/api/products/:id` | Delete product |

#### Categories 📂

| Method | Endpoint | Description |
|:------:|----------|-------------|
| GET | `/api/categories` | List all categories |
| GET | `/api/categories/tree` | Get hierarchical tree |
| GET | `/api/categories/:id` | Get category by ID |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |

#### Suppliers 🏢

| Method | Endpoint | Description |
|:------:|----------|-------------|
| GET | `/api/suppliers` | List all suppliers |
| GET | `/api/suppliers/:id` | Get supplier by ID |
| POST | `/api/suppliers` | Create supplier |
| PUT | `/api/suppliers/:id` | Update supplier |
| DELETE | `/api/suppliers/:id` | Delete supplier |

#### Warehouses 🏭

| Method | Endpoint | Description |
|:------:|----------|-------------|
| GET | `/api/warehouses` | List all warehouses |
| GET | `/api/warehouses/:id` | Get warehouse by ID |
| POST | `/api/warehouses` | Create warehouse |
| PUT | `/api/warehouses/:id` | Update warehouse |
| DELETE | `/api/warehouses/:id` | Delete warehouse |

#### Inventory 📊

| Method | Endpoint | Description |
|:------:|----------|-------------|
| GET | `/api/inventory/warehouse/:id` | Get warehouse inventory |
| GET | `/api/inventory/low-stock` | Get low-stock items |
| GET | `/api/inventory/movements` | Get stock movement history |
| GET | `/api/inventory/reorder-suggestions` | Get auto-reorder suggestions |
| POST | `/api/inventory/receive` | Receive stock |
| POST | `/api/inventory/transfer` | Transfer stock between warehouses |
| POST | `/api/inventory/adjust` | Adjust stock quantity |

#### Sales Orders 🛒

| Method | Endpoint | Description |
|:------:|----------|-------------|
| GET | `/api/orders/sales` | List all sales orders |
| GET | `/api/orders/sales/:id` | Get order details |
| POST | `/api/orders/sales` | Create sales order |
| PUT | `/api/orders/sales/:id/status` | Update order status |

#### Supply Orders 📦

| Method | Endpoint | Description |
|:------:|----------|-------------|
| GET | `/api/orders/supply` | List all supply orders |
| GET | `/api/orders/supply/:id` | Get supply order details |
| POST | `/api/orders/supply` | Create supply order |
| POST | `/api/orders/supply/:id/receive` | Receive supply order |

#### Discount Approvals 💰

| Method | Endpoint | Description |
|:------:|----------|-------------|
| POST | `/api/orders/sales/:id/discount-request` | Request discount |
| PUT | `/api/orders/sales/:id/discount-approve` | Approve/Reject discount 👑 |

#### Reports 📈

| Method | Endpoint | Access |
|:------:|----------|--------|
| GET | `/api/reports/sales` | 👑 Admin, 🛒 Sales |
| GET | `/api/reports/inventory` | 👑 Admin, 🏭 Warehouse |
| GET | `/api/reports/suppliers` | 👑 Admin, 📦 Supply |

#### Export 📤 (Admin Only)

| Method | Endpoint | Description |
|:------:|----------|-------------|
| GET | `/api/export/users` | Export users to CSV |
| GET | `/api/export/products` | Export products to CSV |
| GET | `/api/export/inventory` | Export inventory to CSV |

---

## Database Tables

> **Total: 15 tables** in PostgreSQL

| # | Table | Description | Key Fields |
|:-:|-------|-------------|------------|
| 1 | **users** | User accounts with roles | id, name, email, password_hash, role |
| 2 | **categories** | Hierarchical product categories | id, name, parent_id, description |
| 3 | **suppliers** | Supplier information | id, name, contact_person, rating |
| 4 | **warehouses** | Warehouse locations | id, name, location, capacity |
| 5 | **products** | Product catalog (NO stock) | id, name, sku, price, cost |
| 6 | **inventory** | Stock levels per warehouse | id, product_id, warehouse_id, quantity |
| 7 | **product_locations** | Physical storage details | id, product_id, warehouse_id, aisle, shelf |
| 8 | **sales_orders** | Customer sales orders | id, order_number, customer_name, total_amount |
| 9 | **supply_orders** | Purchase orders from suppliers | id, order_number, supplier_id, total_amount |
| 10 | **order_items** | Order line items | id, order_id, product_id, quantity, unit_price |
| 11 | **stock_movements** | Audit trail for stock changes | id, product_id, quantity_change, movement_type |
| 12 | **discount_approvals** | Discount approval workflow | id, order_id, requested_discount, status |
| 13 | **audit_logs** | User action security logging | id, user_id, action, timestamp |
| 14 | **product_requests** | Sales → Supply product requests | id, product_name, requested_by, status |
| 15 | **adjustment_reasons** | Stock adjustment reason codes | id, code, description, requires_approval |

---

## System Benefits

| Benefit | Description |
|:--------|-------------|
| 🚀 **Production-Ready** | JWT authentication, bcrypt password hashing, token blacklisting |
| 🔒 **Secure** | Role-based access control, input validation, parameterized queries (SQL injection protection) |
| 📈 **Scalable** | Connection pooling, database index optimization |
| 📋 **Auditable** | Complete stock movement history, comprehensive audit logs |
| 🔄 **Flexible** | Multi-warehouse support, hierarchical categories, configurable reorder points |
| 📖 **Documented** | Complete API reference with curl test commands |
| 🔄 **Recoverable** | Password reset scripts, credential display utility |

---

## Troubleshooting

| Issue | Error Message | Solution |
|:------|:--------------|----------|
| **Database connection failed** | `password authentication failed` | Check `DB_PASSWORD` in [`backend/.env`](../backend/.env) |
| **JWT_SECRET not set** | `JWT_SECRET environment variable is not set` | Add `JWT_SECRET` (min 32 chars) to `.env` |
| **Port already in use** | `EADDRINUSE: address already in use :::3000` | Change `PORT` in `.env` or stop existing process |
| **Module not found** | `Cannot find module 'xxx'` | Run `npm install` in `backend/` directory |
| **Tables not found** | `relation "users" does not exist` | Run `node scripts/quick-reset.js` from `backend/` |
| **Forgot password** | Unable to login | Run `npm run reset-password <email> <newPassword>` |
| **Token expired** | `jwt expired` | Login again to get fresh token (24h expiry) |
| **Access denied** | `Access denied` (403) | Verify user role has permission for endpoint |

---

## 📚 Related Documentation

| Document | Description |
|----------|-------------|
| [`API_Endpoints_Reference.md`](./API_Endpoints_Reference.md) | Detailed curl commands for all 55 endpoints |
| [`Backend Setup Guide.md`](./Backend Setup Guide.md) | Step-by-step installation and configuration |
| [`UML_Diagrams.md`](./UML_Diagrams.md) | Mermaid class diagrams |

---

*Last updated: April 2026*