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
node scripts/quick-reset.js
```
This script automatically drops and recreates all tables using [`database/schema.sql`](database/schema.sql).

⚠️ **Important:** The script must be run from the `backend` directory because it uses the `pg` module installed in `backend/node_modules`.

### 2️⃣ **Start Server**

```bash
# Navigate to backend folder
cd inventory-management-system/backend

# Install dependencies
npm install

# Copy environment file
# Edit backend/.env with your PostgreSQL password:
# DB_PASSWORD=your_password_here

# Start the server
npm start
```

Server will run on: **http://localhost:3000**

---

## 🧪 Testing APIs

### Health Check
```bash
curl.exe http://localhost:3000/api/health
```

### Users API
```bash
# Get all users
curl.exe http://localhost:3000/api/users

# Get user by ID
curl.exe http://localhost:3000/api/users/1

# Create new user
curl.exe -X POST http://localhost:3000/api/users ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"John\",\"email\":\"john@test.com\",\"password\":\"123\",\"role\":\"sales\"}"

# Update user
curl.exe -X PUT http://localhost:3000/api/users/1 ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Name\",\"role\":\"warehouse\"}"

# Delete user
curl.exe -X DELETE http://localhost:3000/api/users/5
```

### Products API
```bash
# Get all products
curl.exe http://localhost:3000/api/products

# Get product by ID
curl.exe http://localhost:3000/api/products/1

# Get low stock products
curl.exe http://localhost:3000/api/products/low-stock

# Create new product
curl.exe -X POST http://localhost:3000/api/products ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"New Product\",\"sku\":\"NEW-001\",\"price\":99.99,\"cost\":50.00,\"category_id\":1,\"supplier_id\":1}"

# Update product
curl.exe -X PUT http://localhost:3000/api/products/1 ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Product\",\"price\":109.99}"

# Delete product
curl.exe -X DELETE http://localhost:3000/api/products/1
```

### Categories API
```bash
# Get all categories
curl.exe http://localhost:3000/api/categories

# Get category tree (hierarchical view)
curl.exe http://localhost:3000/api/categories/tree

# Get category by ID
curl.exe http://localhost:3000/api/categories/1

# Create new category
curl.exe -X POST http://localhost:3000/api/categories ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"New Category\",\"parent_id\":1,\"description\":\"Test category\"}"

# Update category
curl.exe -X PUT http://localhost:3000/api/categories/1 ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Category\"}"

# Delete category
curl.exe -X DELETE http://localhost:3000/api/categories/1
```

### Suppliers API
```bash
# Get all suppliers
curl.exe http://localhost:3000/api/suppliers

# Get supplier by ID
curl.exe http://localhost:3000/api/suppliers/1

# Create new supplier
curl.exe -X POST http://localhost:3000/api/suppliers ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"New Supplier\",\"contact_person\":\"John Doe\",\"phone\":\"555-1234\",\"email\":\"orders@supplier.com\"}"

# Update supplier
curl.exe -X PUT http://localhost:3000/api/suppliers/1 ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Supplier\",\"phone\":\"555-5678\"}"

# Delete supplier
curl.exe -X DELETE http://localhost:3000/api/suppliers/1
```

### Warehouses API
```bash
# Get all warehouses
curl.exe http://localhost:3000/api/warehouses

# Get warehouse by ID
curl.exe http://localhost:3000/api/warehouses/1

# Create new warehouse
curl.exe -X POST http://localhost:3000/api/warehouses ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"New Warehouse\",\"location\":\"789 New St\",\"capacity\":5000}"

# Update warehouse
curl.exe -X PUT http://localhost:3000/api/warehouses/1 ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Warehouse\",\"capacity\":10000}"

# Delete warehouse
curl.exe -X DELETE http://localhost:3000/api/warehouses/1
```

### Inventory API
```bash
# Get warehouse inventory
curl.exe http://localhost:3000/api/inventory/warehouse/1

# Get low stock items
curl.exe http://localhost:3000/api/inventory/low-stock

# Get stock movements for a product
curl.exe "http://localhost:3000/api/inventory/movements?product_id=1"

# Receive stock (add inventory)
curl.exe -X POST http://localhost:3000/api/inventory/receive ^
  -H "Content-Type: application/json" ^
  -d "{\"product_id\":1,\"warehouse_id\":1,\"quantity\":50,\"reason\":\"New shipment received\"}"

# Transfer stock between warehouses
curl.exe -X POST http://localhost:3000/api/inventory/transfer ^
  -H "Content-Type: application/json" ^
  -d "{\"product_id\":1,\"from_warehouse_id\":1,\"to_warehouse_id\":2,\"quantity\":25,\"reason\":\"Warehouse redistribution\"}"
```

### Orders API
```bash
# Get all sales orders
curl.exe http://localhost:3000/api/orders/sales

# Get sales order by ID
curl.exe http://localhost:3000/api/orders/sales/1

# Create sales order
curl.exe -X POST http://localhost:3000/api/orders/sales ^
  -H "Content-Type: application/json" ^
  -d "{\"customer_name\":\"John Doe\",\"customer_email\":\"john@example.com\",\"delivery_type\":\"delivery\",\"items\":[{\"product_id\":1,\"quantity\":2,\"unit_price\":999.99}]}"

# Update order status
curl.exe -X PUT http://localhost:3000/api/orders/sales/1/status ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"processing\"}"

# Get all supply orders
curl.exe http://localhost:3000/api/orders/supply

# Create supply order
curl.exe -X POST http://localhost:3000/api/orders/supply ^
  -H "Content-Type: application/json" ^
  -d "{\"supplier_id\":1,\"items\":[{\"product_id\":1,\"quantity\":100,\"unit_price\":750.00}]}"

# Receive supply order
curl.exe -X POST http://localhost:3000/api/orders/supply/1/receive ^
  -H "Content-Type: application/json" ^
  -d "{\"warehouse_id\":1}"
```

### Auth API
```bash
# Register new user
curl.exe -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"New User\",\"email\":\"newuser@test.com\",\"password\":\"password123\",\"role\":\"sales\"}"

# Login
curl.exe -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@ims.com\",\"password\":\"admin123\"}"

# Get current user (requires token)
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/auth/me
```

---

## 🔑 Credentials & Testing

### View All Credentials

Run the following command anytime to see all system credentials:

```bash
npm run show-creds
```

**Credentials are also printed automatically on server startup.**

### Reset Password

To reset any user's password:

```bash
npm run reset-password admin@ims.com admin123
```

**Usage:** `npm run reset-password <email> <newPassword>`

### Test Login

Test the login endpoint with curl:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ims.com","password":"admin123"}'
```

For Windows CMD (use `^` for line continuation):

```bash
curl.exe -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@ims.com\",\"password\":\"admin123\"}"
```

---

## 📁 Project Structure

```
inventory-management-system/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── User.js           ← User business logic
│   │   │   ├── Product.js        ← Product business logic
│   │   │   ├── Category.js       ← Category business logic
│   │   │   ├── Supplier.js       ← Supplier business logic
│   │   │   ├── Warehouse.js      ← Warehouse business logic
│   │   │   ├── Inventory.js      ← Inventory business logic
│   │   │   ├── StockMovement.js  ← Stock movement tracking
│   │   │   ├── SalesOrder.js     ← Sales order logic
│   │   │   └── SupplyOrder.js    ← Supply order logic
│   │   ├── controllers/          ← HTTP request handlers
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── productController.js
│   │   │   ├── categoryController.js
│   │   │   ├── supplierController.js
│   │   │   ├── warehouseController.js
│   │   │   ├── inventoryController.js
│   │   │   └── orderController.js
│   │   ├── routes/               ← API endpoint definitions
│   │   │   ├── authRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── productRoutes.js
│   │   │   ├── categoryRoutes.js
│   │   │   ├── supplierRoutes.js
│   │   │   ├── warehouseRoutes.js
│   │   │   ├── inventoryRoutes.js
│   │   │   └── orderRoutes.js
│   │   ├── middleware/
│   │   │   └── auth.js           ← Authentication middleware
│   │   ├── db/
│   │   │   └── pool.js           ← Database connection pool
│   │   └── app.js                ← Express server setup
│   ├── typescript-demo/          ← TypeScript reference files
│   ├── package.json
│   └── .env                      ← Environment configuration
├── database/
│   └── schema.sql                ← Database schema (12 tables)
└── docs/                         ← Documentation
```

---

## 🔌 API Endpoints Summary

| Module | Method | Endpoint | Description |
|--------|--------|----------|-------------|
| **Health** | GET | `/api/health` | Server health check |
| **Auth** | POST | `/api/auth/register` | Register new user |
| **Auth** | POST | `/api/auth/login` | User login |
| **Auth** | GET | `/api/auth/me` | Get current user |
| **Users** | GET | `/api/users` | Get all users |
| **Users** | GET | `/api/users/:id` | Get user by ID |
| **Users** | POST | `/api/users` | Create user |
| **Users** | PUT | `/api/users/:id` | Update user |
| **Users** | DELETE | `/api/users/:id` | Delete user |
| **Products** | GET | `/api/products` | Get all products |
| **Products** | GET | `/api/products/:id` | Get product by ID |
| **Products** | GET | `/api/products/low-stock` | Get low stock products |
| **Products** | POST | `/api/products` | Create product |
| **Products** | PUT | `/api/products/:id` | Update product |
| **Products** | DELETE | `/api/products/:id` | Delete product |
| **Categories** | GET | `/api/categories` | Get all categories |
| **Categories** | GET | `/api/categories/tree` | Get category hierarchy |
| **Categories** | GET | `/api/categories/:id` | Get category by ID |
| **Categories** | POST | `/api/categories` | Create category |
| **Categories** | PUT | `/api/categories/:id` | Update category |
| **Categories** | DELETE | `/api/categories/:id` | Delete category |
| **Suppliers** | GET | `/api/suppliers` | Get all suppliers |
| **Suppliers** | GET | `/api/suppliers/:id` | Get supplier by ID |
| **Suppliers** | POST | `/api/suppliers` | Create supplier |
| **Suppliers** | PUT | `/api/suppliers/:id` | Update supplier |
| **Suppliers** | DELETE | `/api/suppliers/:id` | Delete supplier |
| **Warehouses** | GET | `/api/warehouses` | Get all warehouses |
| **Warehouses** | GET | `/api/warehouses/:id` | Get warehouse by ID |
| **Warehouses** | POST | `/api/warehouses` | Create warehouse |
| **Warehouses** | PUT | `/api/warehouses/:id` | Update warehouse |
| **Warehouses** | DELETE | `/api/warehouses/:id` | Delete warehouse |
| **Inventory** | GET | `/api/inventory/warehouse/:id` | Get warehouse inventory |
| **Inventory** | GET | `/api/inventory/low-stock` | Get low stock items |
| **Inventory** | GET | `/api/inventory/movements` | Get stock movements |
| **Inventory** | POST | `/api/inventory/receive` | Receive stock |
| **Inventory** | POST | `/api/inventory/transfer` | Transfer stock |
| **Orders** | GET | `/api/orders/sales` | Get sales orders |
| **Orders** | GET | `/api/orders/sales/:id` | Get sales order by ID |
| **Orders** | POST | `/api/orders/sales` | Create sales order |
| **Orders** | PUT | `/api/orders/sales/:id/status` | Update order status |
| **Orders** | GET | `/api/orders/supply` | Get supply orders |
| **Orders** | GET | `/api/orders/supply/:id` | Get supply order by ID |
| **Orders** | POST | `/api/orders/supply` | Create supply order |
| **Orders** | POST | `/api/orders/supply/:id/receive` | Receive supply order |

---

## ⚙️ Environment Variables

Edit `backend/.env` with your configuration:

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

# JWT Configuration (for future use)
JWT_SECRET=checkpoint_secret_key_2024
JWT_EXPIRES_IN=24h
```

---

## 🗄️ Database Tables

The database includes 12 tables:
1. **users** - User accounts with roles (admin, sales, warehouse, supply)
2. **categories** - Product categories with hierarchical structure
3. **suppliers** - Supplier information
4. **warehouses** - Warehouse locations and capacity
5. **products** - Product catalog
6. **inventory** - Product quantities per warehouse
7. **product_locations** - Detailed storage locations (aisle, shelf, layer)
8. **sales_orders** - Customer sales orders
9. **supply_orders** - Purchase orders to suppliers
10. **order_items** - Order line items (polymorphic)
11. **stock_movements** - Audit trail for inventory changes
12. **discount_approvals** - Discount approval workflow

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Database connection successful (check terminal for ✅ message)
- [ ] Health check returns `{"status":"OK"}` at http://localhost:3000/api/health
- [ ] Users API returns sample users at http://localhost:3000/api/users
- [ ] Products API returns sample products at http://localhost:3000/api/products
- [ ] Categories API returns category hierarchy at http://localhost:3000/api/categories
- [ ] Suppliers API returns sample suppliers at http://localhost:3000/api/suppliers
- [ ] Warehouses API returns sample warehouses at http://localhost:3000/api/warehouses
- [ ] Inventory API shows stock levels at http://localhost:3000/api/inventory/warehouse/1

**Note:** Most endpoints (except `/api/health`) require authentication. The server uses a fallback authentication that grants admin access when no valid token is provided (see [`backend/src/app.js`](backend/src/app.js:17-32)).

---

## 🐛 Troubleshooting

### Database Connection Failed
```
❌ Database connection failed: password authentication failed
```
**Solution:** Edit `backend/.env` and set the correct `DB_PASSWORD`

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

---

## 🔧 Database Reset

### Using the Reset Script
To quickly reset the database (drops and recreates all tables):

```bash
# Navigate to backend folder first
cd backend

# Run the reset script
node scripts/quick-reset.js
```

The [`backend/scripts/quick-reset.js`](backend/scripts/quick-reset.js) script will:
1. Drop all existing tables and ENUM types
2. Connect to PostgreSQL using your `.env` configuration
3. Read and execute the entire [`database/schema.sql`](database/schema.sql)
4. Recreate all tables with sample data

**Note:** This will delete all existing data in the database!

⚠️ **Important:** The script must be run from the `backend` directory because it depends on the `pg` module installed in `backend/node_modules`.

---

## 📝 Current Implementation Status

This is **Checkpoint 3** of the Inventory Management System. The following features are implemented:

### Core Features
✅ User management with role-based access (admin, sales, warehouse, supply)
✅ Product catalog with categories and suppliers
✅ Multi-warehouse inventory tracking
✅ Stock movement audit trail
✅ Sales order processing
✅ Supply/purchase order management
✅ Low stock alerts
✅ Stock receiving and transfers

### Checkpoint 3 - New Features
✅ **Reporting System** - Sales, Inventory, and Supplier performance reports ([`backend/src/routes/reportRoutes.js`](backend/src/routes/reportRoutes.js))
✅ **Data Export** - CSV export for users, products, and inventory ([`backend/src/routes/exportRoutes.js`](backend/src/routes/exportRoutes.js))
✅ **Audit Logging** - Track all user actions for security ([`database/schema.sql`](database/schema.sql:238-249))
✅ **Product Requests** - Sales team can request new products from Supply ([`database/schema.sql`](database/schema.sql:252-266))
✅ **Adjustment Reasons** - Standard reasons for stock adjustments ([`database/schema.sql`](database/schema.sql:269-285))

### Database Tables (15 total)
1. **users** - User accounts with roles
2. **categories** - Product categories with hierarchical structure
3. **suppliers** - Supplier information
4. **warehouses** - Warehouse locations and capacity
5. **products** - Product catalog
6. **inventory** - Product quantities per warehouse
7. **product_locations** - Detailed storage locations (aisle, shelf, layer)
8. **sales_orders** - Customer sales orders
9. **supply_orders** - Purchase orders to suppliers
10. **order_items** - Order line items (polymorphic)
11. **stock_movements** - Audit trail for inventory changes
12. **discount_approvals** - Discount approval workflow
13. **audit_logs** - User action tracking (Checkpoint 3)
14. **product_requests** - New product requests (Checkpoint 3)
15. **adjustment_reasons** - Stock adjustment reasons (Checkpoint 3)

### API Endpoints Summary

| Module | Method | Endpoint | Auth Required | Description |
|--------|--------|----------|---------------|-------------|
| **Health** | GET | `/api/health` | ❌ | Server health check |
| **Auth** | POST | `/api/auth/register` | ❌ | Register new user |
| **Auth** | POST | `/api/auth/login` | ❌ | User login |
| **Auth** | GET | `/api/auth/me` | ✅ | Get current user |
| **Users** | GET | `/api/users` | ✅ | Get all users |
| **Users** | GET | `/api/users/:id` | ✅ | Get user by ID |
| **Users** | POST | `/api/users` | ✅ | Create user |
| **Users** | PUT | `/api/users/:id` | ✅ | Update user |
| **Users** | DELETE | `/api/users/:id` | ✅ | Delete user |
| **Products** | GET | `/api/products` | ✅ | Get all products |
| **Products** | GET | `/api/products/:id` | ✅ | Get product by ID |
| **Products** | GET | `/api/products/low-stock` | ✅ | Get low stock products |
| **Products** | POST | `/api/products` | ✅ | Create product |
| **Products** | PUT | `/api/products/:id` | ✅ | Update product |
| **Products** | DELETE | `/api/products/:id` | ✅ | Delete product |
| **Categories** | GET | `/api/categories` | ✅ | Get all categories |
| **Categories** | GET | `/api/categories/tree` | ✅ | Get category hierarchy |
| **Categories** | GET | `/api/categories/:id` | ✅ | Get category by ID |
| **Categories** | POST | `/api/categories` | ✅ | Create category |
| **Categories** | PUT | `/api/categories/:id` | ✅ | Update category |
| **Categories** | DELETE | `/api/categories/:id` | ✅ | Delete category |
| **Suppliers** | GET | `/api/suppliers` | ✅ | Get all suppliers |
| **Suppliers** | GET | `/api/suppliers/:id` | ✅ | Get supplier by ID |
| **Suppliers** | POST | `/api/suppliers` | ✅ | Create supplier |
| **Suppliers** | PUT | `/api/suppliers/:id` | ✅ | Update supplier |
| **Suppliers** | DELETE | `/api/suppliers/:id` | ✅ | Delete supplier |
| **Warehouses** | GET | `/api/warehouses` | ✅ | Get all warehouses |
| **Warehouses** | GET | `/api/warehouses/:id` | ✅ | Get warehouse by ID |
| **Warehouses** | POST | `/api/warehouses` | ✅ | Create warehouse |
| **Warehouses** | PUT | `/api/warehouses/:id` | ✅ | Update warehouse |
| **Warehouses** | DELETE | `/api/warehouses/:id` | ✅ | Delete warehouse |
| **Inventory** | GET | `/api/inventory/warehouse/:id` | ✅ | Get warehouse inventory |
| **Inventory** | GET | `/api/inventory/low-stock` | ✅ | Get low stock items |
| **Inventory** | GET | `/api/inventory/movements` | ✅ | Get stock movements |
| **Inventory** | POST | `/api/inventory/receive` | ✅ | Receive stock |
| **Inventory** | POST | `/api/inventory/transfer` | ✅ | Transfer stock |
| **Orders** | GET | `/api/orders/sales` | ✅ | Get sales orders |
| **Orders** | GET | `/api/orders/sales/:id` | ✅ | Get sales order by ID |
| **Orders** | POST | `/api/orders/sales` | ✅ | Create sales order |
| **Orders** | PUT | `/api/orders/sales/:id/status` | ✅ | Update order status |
| **Orders** | GET | `/api/orders/supply` | ✅ | Get supply orders |
| **Orders** | GET | `/api/orders/supply/:id` | ✅ | Get supply order by ID |
| **Orders** | POST | `/api/orders/supply` | ✅ | Create supply order |
| **Orders** | POST | `/api/orders/supply/:id/receive` | ✅ | Receive supply order |
| **Reports** | GET | `/api/reports/sales` | ✅ | Sales report (Admin/Sales) |
| **Reports** | GET | `/api/reports/inventory` | ✅ | Inventory report (Admin/Warehouse) |
| **Reports** | GET | `/api/reports/suppliers` | ✅ | Supplier report (Admin/Supply) |
| **Export** | GET | `/api/export/users` | Admin Only | Export users to CSV |
| **Export** | GET | `/api/export/products` | Admin Only | Export products to CSV |
| **Export** | GET | `/api/export/inventory` | Admin Only | Export inventory to CSV |

### Authentication

The system uses JWT-based authentication with role-based access control ([`backend/src/middleware/auth.js`](backend/src/middleware/auth.js)):

- **Public endpoints**: `/api/health`, `/api/auth/register`, `/api/auth/login`
- **Protected endpoints**: All other endpoints require a valid JWT token
- **Role-based access**: Some endpoints restrict access to specific roles (e.g., reports, exports)

```bash
# Login to get token
curl.exe -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@ims.com\",\"password\":\"admin123\"}"

# Use token in subsequent requests
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/users
```

### Coming Soon
- Frontend UI integration
- Email notifications
- Barcode scanning
- Advanced analytics dashboard
