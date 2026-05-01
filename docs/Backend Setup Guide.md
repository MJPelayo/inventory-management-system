# Inventory Management System - Backend Setup Guide

## 📋 Quick Setup (5 Minutes)

### 1️⃣ **Database Setup (pgAdmin4)**

**Option A: Manual Setup**
```
# Open pgAdmin4
# Right-click Databases → Create → Database
# Name: inventory_db
# Owner: postgres
# Click Save

# Right-click inventory_db → Query Tool
# Copy entire database/schema.sql
# Press F5 to execute
```

**Option B: Automated Reset Script**
```bash
# Navigate to backend folder first
cd backend

# Run the reset script
node scripts/full-reset.js
```
This script automatically drops and recreates all tables using [`database/schema.sql`](database/schema.sql).

⚠️ **Important:** The script must be run from the `backend` directory because it uses the `pg` module installed in `backend/node_modules`.

### 2️⃣ **Environment Configuration**

Create a `.env` file in the `backend` folder:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=inventory_db

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration (REQUIRED - must be 32+ characters)
JWT_SECRET=generate-a-strong-secret-key-at-least-32-characters-long
JWT_EXPIRE=24h
```

Generate a secure `JWT_SECRET`:

```bash
# On Mac/Linux/WSL:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString()))
```

### 3️⃣ **Start Server**

```bash
# Navigate to backend folder
cd inventory-management-system/backend

# Install dependencies
npm install

# Start the server
npm start

# Or for development with auto-restart
npm run dev
```

Server will run on: **http://localhost:3000**

---

## 🔐 Credentials & Testing

### Default Test Accounts (Created Automatically)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ims.com | admin123 |
| Sales | sales@ims.com | sales123 |
| Warehouse | warehouse@ims.com | warehouse123 |
| Supply | supply@ims.com | supply123 |

[View All Credentials](#view-all-credentials)

### Run This Command Anytime to See All System Credentials:

```bash
npm run show-creds
```

Credentials are also printed automatically on server startup.

### Reset Password (Safety Net)

To reset any user's password:

```bash
npm run reset-password admin@ims.com admin123
```

**Usage:** `npm run reset-password <email> <newPassword>`

---

## 🧪 Testing APIs

### Test Login (Get JWT Token)

```bash
curl.exe -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@ims.com\",\"password\":\"admin123\"}"
```

Save the returned token for subsequent requests.

### Health Check (No Auth Required)

```bash
curl.exe http://localhost:3000/api/health
```

### Protected Endpoint Examples (with Token)

Replace `YOUR_TOKEN_HERE` with the token from login:

```bash
# Get all users
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/users

# Get all products
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/products

# Get low stock inventory
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/inventory/low-stock

# Create a sales order
curl.exe -X POST http://localhost:3000/api/orders/sales ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"customer_name\":\"John Doe\",\"delivery_type\":\"delivery\",\"items\":[{\"product_id\":1,\"quantity\":2,\"unit_price\":999.99}]}"
```

---

## 📁 Project Structure

```
inventory-management-system/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── User.js              # User business logic
│   │   │   ├── Product.js           # Product business logic
│   │   │   ├── Category.js          # Category hierarchy
│   │   │   ├── Supplier.js          # Supplier management
│   │   │   ├── Warehouse.js         # Warehouse management
│   │   │   ├── Inventory.js         # Stock tracking
│   │   │   ├── StockMovement.js     # Audit trail
│   │   │   ├── SalesOrder.js        # Customer orders
│   │   │   ├── SupplyOrder.js       # Purchase orders
│   │   │   └── AuditLog.js          # Security logging
│   │   ├── controllers/
│   │   │   ├── auditLogController.js
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── productController.js
│   │   │   ├── inventoryController.js
│   │   │   ├── orderController.js
│   │   │   ├── reportController.js
│   │   │   └── exportController.js
│   │   ├── routes/
│   │   │   ├── auditLogRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── productRoutes.js
│   │   │   ├── inventoryRoutes.js
│   │   │   ├── orderRoutes.js
│   │   │   ├── reportRoutes.js
│   │   │   └── exportRoutes.js
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT + RBAC
│   │   ├── db/
│   │   │   └── pool.js              # PostgreSQL connection
│   │   ├── app.js
│   │   └── server.js
│   ├── scripts/
│   │   ├── full-reset.js            # Database reset
│   │   └── show-credentials.js      # Display all credentials
│   ├── package.json
│   └── .env
├── database/
│   └── schema.sql                   # Complete DB schema (15 tables)
└── docs/
    ├── API_Endpoints_Reference.md
    ├── UML_Diagrams.md
    └── Backend_Setup_Guide.md
```

---

## 🗄️ Database Tables (15 Total)

| # | Table | Description |
|---|-------|-------------|
| 1 | users | User accounts with roles (admin, sales, warehouse, supply) |
| 2 | categories | Product categories with hierarchical structure |
| 3 | suppliers | Supplier information and performance metrics |
| 4 | warehouses | Warehouse locations and capacity |
| 5 | products | Product catalog with SKU, pricing |
| 6 | inventory | Product quantities per warehouse |
| 7 | product_locations | Detailed storage (aisle/side/shelf/layer) |
| 8 | sales_orders | Customer sales orders |
| 9 | supply_orders | Purchase orders to suppliers |
| 10 | order_items | Order line items (polymorphic) |
| 11 | stock_movements | Audit trail for inventory changes |
| 12 | discount_approvals | Discount approval workflow |
| 13 | audit_logs | User action tracking (security) |
| 14 | product_requests | New product requests (Sales → Supply) |
| 15 | adjustment_reasons | Stock adjustment reason codes |

---

## 🔌 Complete API Endpoints (57 Total)

### Public Endpoints (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login (returns JWT) |

### Protected Endpoints (JWT Required)

#### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/auth/me | Get current user |

#### Users (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | List all users |
| GET | /api/users/:id | Get user by ID |
| POST | /api/users | Create user |
| PUT | /api/users/:id | Update user |
| DELETE | /api/users/:id | Delete user |

#### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | List products |
| GET | /api/products/:id | Get product |
| GET | /api/products/low-stock | Low stock alerts |
| POST | /api/products | Create product |
| PUT | /api/products/:id | Update product |
| PUT | /api/products/bulk-price | Bulk price update (Admin) |
| DELETE | /api/products/:id | Delete product |

#### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/categories | List categories |
| GET | /api/categories/tree | Hierarchy tree |
| GET | /api/categories/:id | Get category |
| POST | /api/categories | Create category |
| PUT | /api/categories/:id | Update category |
| DELETE | /api/categories/:id | Delete category |

#### Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/inventory/warehouse/:id | Warehouse inventory |
| GET | /api/inventory/low-stock | Low stock items |
| GET | /api/inventory/movements | Stock history |
| GET | /api/inventory/reorder-suggestions | Auto-reorder suggestions |
| POST | /api/inventory/receive | Receive stock |
| POST | /api/inventory/transfer | Transfer stock |
| POST | /api/inventory/adjust | Adjust stock |

#### Sales Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/orders/sales | List sales orders |
| GET | /api/orders/sales/:id | Get order details |
| POST | /api/orders/sales | Create order |
| PUT | /api/orders/sales/:id/status | Update status |

#### Supply Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/orders/supply | List POs |
| GET | /api/orders/supply/:id | Get PO details |
| POST | /api/orders/supply | Create PO |
| POST | /api/orders/supply/:id/receive | Receive PO |
| POST | /api/orders/supply/:id/cancel | Cancel PO (Supply/Admin) |

#### Discount Approvals

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/orders/sales/:id/discount-request | Request discount |
| PUT | /api/orders/sales/:id/discount-approve | Approve/Reject (Admin) |

#### Reports (Role-based)

| Method | Endpoint | Access |
|--------|----------|--------|
| GET | /api/reports/sales | Admin, Sales |
| GET | /api/reports/inventory | Admin, Warehouse |
| GET | /api/reports/suppliers | Admin, Supply |

#### Export (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/export/users | Export users to CSV |
| GET | /api/export/products | Export products to CSV |
| GET | /api/export/inventory | Export inventory to CSV |

#### Audit Logs (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/audit-logs | Get all audit logs |
| GET | /api/audit-logs/entity/:type/:id | Get logs for specific entity |

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Database connection successful (check terminal for ✅ message)
- [ ] Health check returns `{"status":"OK"}` at http://localhost:3000/api/health
- [ ] Login returns a JWT token
- [ ] Using the token, users API returns data
- [ ] Products API returns sample products
- [ ] Categories API returns category hierarchy
- [ ] Inventory API shows stock levels
- [ ] `npm run show-creds` displays all credentials
- [ ] `npm run reset-password` works for recovery

---

## 🐛 Troubleshooting

### Database Connection Failed
```
❌ Database connection failed: password authentication failed
```
**Solution:** Edit [`backend/.env`](backend/.env) and set the correct `DB_PASSWORD`

### JWT_SECRET Not Set
```
Error: JWT_SECRET environment variable is not set
```
**Solution:** Add `JWT_SECRET=your-secret-key-min-32-chars` to `.env`

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:** Change `PORT=3001` in `.env` or stop the process using port 3000

### Module Not Found
```
Error: Cannot find module 'xxx'
```
**Solution:** Run `npm install` in the backend directory

### Cannot Find Table
```
error: relation "users" does not exist
```
**Solution:** Run `node scripts/full-reset.js` to initialize database

---

## 🔧 Database Reset

### Using the Reset Script (Recommended)

```bash
# Navigate to backend folder first
cd backend

# Run the reset script (drops and recreates all tables)
node scripts/full-reset.js
```

**What it does:**
1. Drops all existing tables and ENUM types
2. Reads and executes [`database/schema.sql`](database/schema.sql)
3. Creates all 15 tables with sample data

⚠️ **Warning:** This will delete all existing data in the database!

---

## 🔐 Security Features

Your backend includes enterprise-grade security:

| Feature | Implementation |
|---------|----------------|
| Password Storage | bcrypt hashing (10 rounds) |
| Authentication | JWT with HS256 |
| Token Expiry | 24 hours |
| Token Revocation | Blacklist support |
| Algorithm Security | Explicit algorithms, no confusion attacks |
| Role-Based Access | Middleware verification on every request |
| Audit Logging | All sensitive actions logged |
| Input Validation | On all controllers |
| SQL Injection Protection | Parameterized queries |

---

## 📝 NPM Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server (auto-restart) |
| `npm run show-creds` | Display all system credentials |
| `npm run reset-password` | Reset user password |
| `npm run db:init` | Initialize database from schema.sql |
| `npm test` | Run tests (Jest) |

---

## 🎯 Checkpoint 3 - Complete Features

| Feature | Status |
|---------|--------|
| User Management with RBAC | ✅ |
| Product Catalog with Categories | ✅ |
| Multi-Warehouse Inventory | ✅ |
| Stock Movement Audit Trail | ✅ |
| Sales Order Processing | ✅ |
| Supply Order Management | ✅ |
| Low Stock Alerts | ✅ |
| Stock Receiving & Transfers | ✅ |
| Reporting System (Sales/Inventory/Supplier) | ✅ |
| Data Export (CSV) | ✅ |
| Audit Logging | ✅ |
| Product Requests (Sales → Supply) | ✅ |
| Adjustment Reasons | ✅ |
| Discount Approval Workflow | ✅ |
| Bulk Price Update | ✅ |
| Auto-Reorder Suggestions | ✅ |
| JWT Authentication with Revocation | ✅ |
| Password Recovery Scripts | ✅ |
| Complete API Documentation | ✅ |
| UML Diagrams | ✅ |

---

## 🚀 Your Backend is 100% Ready!

You can now:
1. Start the server with `npm run dev`
2. Login with `admin@ims.com` / `admin123`
3. Test all 57 API endpoints
4. Proceed to frontend development

Credentials are printed on startup - save them for your demo!
