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

The frontend is served statically from the `frontend/` directory and will be accessible at the same URL.

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
│   │   │   ├── BaseModel.js           # Base class for all models
│   │   │   ├── User.js                # User business logic
│   │   │   ├── Product.js             # Product business logic
│   │   │   ├── Category.js            # Category hierarchy
│   │   │   ├── Supplier.js            # Supplier management
│   │   │   ├── Warehouse.js           # Warehouse management
│   │   │   ├── Inventory.js           # Stock tracking
│   │   │   ├── StockMovement.js       # Audit trail
│   │   │   ├── SalesOrder.js          # Customer orders
│   │   │   ├── SupplyOrder.js         # Purchase orders
│   │   │   ├── AuditLog.js            # Security logging
│   │   │   ├── DeliveryType.js        # Dropdown data
│   │   │   ├── OrderStatus.js         # Dropdown data
│   │   │   ├── PaymentStatus.js       # Dropdown data
│   │   │   ├── PaymentTerm.js         # Dropdown data
│   │   │   ├── ShippingMethod.js      # Dropdown data
│   │   │   └── UserRole.js            # Dropdown data
│   │   ├── controllers/
│   │   │   ├── auditLogController.js
│   │   │   ├── authController.js
│   │   │   ├── categoryController.js
│   │   │   ├── dropdownController.js
│   │   │   ├── exportController.js
│   │   │   ├── inventoryController.js
│   │   │   ├── inventoryReportController.js
│   │   │   ├── messageController.js
│   │   │   ├── notificationController.js
│   │   │   ├── orderController.js
│   │   │   ├── paymentTermController.js
│   │   │   ├── permissionController.js
│   │   │   ├── productController.js
│   │   │   ├── reportController.js
│   │   │   ├── requestController.js
│   │   │   ├── settingsController.js
│   │   │   ├── supplierController.js
│   │   │   ├── userController.js
│   │   │   └── warehouseController.js
│   │   ├── routes/
│   │   │   ├── auditLogRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── categoryRoutes.js
│   │   │   ├── dropdownRoutes.js
│   │   │   ├── exportRoutes.js
│   │   │   ├── inventoryRoutes.js
│   │   │   ├── messageRoutes.js
│   │   │   ├── notificationRoutes.js
│   │   │   ├── orderRoutes.js
│   │   │   ├── paymentTermRoutes.js
│   │   │   ├── permissionRoutes.js
│   │   │   ├── productRoutes.js
│   │   │   ├── reportRoutes.js
│   │   │   ├── requestRoutes.js
│   │   │   ├── settingsRoutes.js
│   │   │   ├── supplierRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   └── warehouseRoutes.js
│   │   ├── middleware/
│   │   │   ├── auth.js                # JWT + RBAC
│   │   │   ├── permissions.js         # Fine-grained permissions
│   │   │   ├── sanitize.js            # Input sanitization
│   │   │   └── security.js            # SQL injection protection
│   │   ├── db/
│   │   │   ├── pool.js                # PostgreSQL connection
│   │   │   └── queryBuilder.js        # Query builder utility
│   │   ├── app.js                     # Express app setup
│   │   └── server.js                  # Entry point
│   ├── scripts/
│   │   ├── full-reset.js              # Database reset
│   │   └── show-credentials.js        # Display credentials
│   ├── package.json
│   └── .env
├── database/
│   └── schema.sql                     # Complete DB schema (27 tables)
├── frontend/
│   ├── index.html
│   ├── css/
│   ├── js/
│   ├── pages/
│   │   ├── admin/
│   │   ├── sales/
│   │   ├── supply/
│   │   └── warehouse/
│   └── assets/
└── docs/
    ├── API_Endpoints_Reference.md
    ├── UML_Diagrams.md
    └── Backend_Setup_Guide.md
```

---

## 🗄️ Database Tables (27 Total)

| # | Table | Description |
|---|-------|-------------|
| 1 | users | User accounts with roles (admin, sales, warehouse, supply) |
| 2 | user_roles | Role definitions and descriptions |
| 3 | categories | Product categories with hierarchical structure |
| 4 | suppliers | Supplier information and performance metrics |
| 5 | warehouses | Warehouse locations and capacity |
| 6 | products | Product catalog with SKU, pricing |
| 7 | inventory | Product quantities per warehouse |
| 8 | product_locations | Detailed storage (aisle/side/shelf/layer) |
| 9 | sales_orders | Customer sales orders |
| 10 | supply_orders | Purchase orders to suppliers |
| 11 | order_items | Order line items (polymorphic) |
| 12 | stock_movements | Audit trail for inventory changes |
| 13 | discount_approvals | Discount approval workflow |
| 14 | audit_logs | User action tracking (security) |
| 15 | adjustment_reasons | Stock adjustment reason codes |
| 16 | notifications | User notifications |
| 17 | system_settings | System configuration settings |
| 18 | internal_requests | Cross-role requests (deletion, approvals) |
| 19 | internal_messages | Internal messaging system |
| 20 | user_permissions | Fine-grained user permissions |
| 21 | permission_audit_log | Permission change history |
| 22 | role_default_permissions | Default permissions per role |
| 23 | payment_terms | Payment term options |
| 24 | delivery_types | Delivery type options |
| 25 | order_statuses | Order status options |
| 26 | payment_statuses | Payment status options |
| 27 | shipping_methods | Shipping method options |

---

## 🔌 Complete API Endpoints (95 Total)

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
| POST | /api/auth/refresh | Refresh token |

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
| GET | /api/inventory/product/:id/warehouse/:id/location | Product location |
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
| GET | /api/reports/inventory/export | Admin, Warehouse |
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

#### Dropdowns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dropdowns/all | Get all dropdowns |
| GET | /api/dropdowns/payment-terms | Payment terms |
| GET | /api/dropdowns/delivery-types | Delivery types |
| GET | /api/dropdowns/order-statuses | Order statuses |
| GET | /api/dropdowns/payment-statuses | Payment statuses |
| GET | /api/dropdowns/user-roles | User roles |
| GET | /api/dropdowns/shipping-methods | Shipping methods |

#### Payment Terms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/payment-terms | List payment terms |
| GET | /api/payment-terms/:id | Get payment term |

#### Permissions (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/permissions/users/:id/permissions | Get user permissions |
| PUT | /api/permissions/users/:id/permissions | Update permissions |
| POST | /api/permissions/users/:id/permissions/reset | Reset to defaults |
| GET | /api/permissions/settings/role-defaults | Get role defaults |
| PUT | /api/permissions/settings/role-defaults | Update role defaults |
| GET | /api/permissions/audit/permissions | Permission audit log |
| GET | /api/audit/permissions | Alias for permission audit |

#### Settings (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/settings/system | Get all settings |
| GET | /api/settings/system/:key | Get single setting |
| PUT | /api/settings/system | Update settings |

#### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/messages | Get messages |
| POST | /api/messages | Send message |
| GET | /api/messages/unread | Unread count |
| PUT | /api/messages/:id/read | Mark as read |
| GET | /api/messages/conversation/:userId | Get conversation |

#### Requests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/requests | Get all requests |
| GET | /api/requests/my | Get my requests |
| POST | /api/requests | Create request |
| POST | /api/requests/:id/approve | Approve (Admin) |
| POST | /api/requests/:id/deny | Deny (Admin) |

#### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications | Get notifications |
| GET | /api/notifications/unread/count | Unread count |
| PUT | /api/notifications/:id/read | Mark as read |
| PUT | /api/notifications/read/all | Mark all as read |

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
- [ ] Frontend is accessible at http://localhost:3000

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
3. Creates all 27 tables with sample data

⚠️ **Warning:** This will delete all existing data in the database!

---

## 🔒 Security Features

Your backend includes enterprise-grade security:

| Feature | Implementation |
|---------|----------------|
| Password Storage | bcrypt hashing (10 rounds) |
| Authentication | JWT with HS256 |
| Token Expiry | 24 hours |
| Token Revocation | Blacklist support |
| Token Refresh | Automatic refresh before expiry |
| Algorithm Security | Explicit algorithms, no confusion attacks |
| Role-Based Access | Middleware verification on every request |
| Fine-Grained Permissions | Module-level permissions (read/create/edit/delete/full) |
| Audit Logging | All sensitive actions logged |
| Input Validation | On all controllers |
| SQL Injection Protection | Parameterized queries + detection middleware |
| Input Sanitization | Global sanitization middleware |

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

## 🎯 System Features

| Feature | Status |
|---------|--------|
| User Management with RBAC | ✅ |
| Fine-Grained Permissions | ✅ |
| Product Catalog with Categories | ✅ |
| Multi-Warehouse Inventory | ✅ |
| Stock Movement Audit Trail | ✅ |
| Sales Order Processing | ✅ |
| Supply Order Management | ✅ |
| Low Stock Alerts | ✅ |
| Stock Receiving & Transfers | ✅ |
| Stock Adjustments with Reason Codes | ✅ |
| Product Location Tracking | ✅ |
| Auto-Reorder Suggestions | ✅ |
| Reporting System (Sales/Inventory/Supplier) | ✅ |
| Data Export (CSV) | ✅ |
| Audit Logging | ✅ |
| Discount Approval Workflow | ✅ |
| Bulk Price Update | ✅ |
| JWT Authentication with Refresh | ✅ |
| Password Recovery Scripts | ✅ |
| Internal Messaging System | ✅ |
| Cross-Role Requests | ✅ |
| Notifications System | ✅ |
| System Settings Management | ✅ |
| Dropdown Master Data | ✅ |
| Complete API Documentation | ✅ |
| UML Diagrams | ✅ |

---

## 🚀 Your Backend is 100% Ready!

You can now:
1. Start the server with `npm run dev`
2. Login with `admin@ims.com` / `admin123`
3. Test all 95 API endpoints
4. Access the frontend at http://localhost:3000

Credentials are printed on startup - save them for your demo!
