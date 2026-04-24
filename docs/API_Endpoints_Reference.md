# Inventory Management System - API Endpoints Reference

Complete reference for all working API endpoints with curl test commands.

**Base URL:** `http://localhost:3000`

---

## Table of Contents

1. [Health Check](#health-check)
2. [Authentication](#authentication)
3. [Users](#users)
4. [Products](#products)
5. [Categories](#categories)
6. [Suppliers](#suppliers)
7. [Warehouses](#warehouses)
8. [Inventory](#inventory)
9. [Sales Orders](#sales-orders)
10. [Supply Orders](#supply-orders)
11. [Discount Approvals](#discount-approvals)
12. [Reports](#reports)
13. [Export](#export)
14. [Credentials Management](#credentials-management)

---

## Health Check

### GET `/api/health`
Check if the server is running and healthy.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-04-24T01:00:00.000Z"
}
```

---

## Authentication

### POST `/api/auth/register`
Register a new user account.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"New User\",\"email\":\"newuser@test.com\",\"password\":\"password123\",\"role\":\"sales\",\"department\":\"Sales\"}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | User's full name |
| email | string | Yes | User's email (must be unique) |
| password | string | Yes | User's password (min 6 chars) |
| role | string | Yes | `admin`, `sales`, `warehouse`, or `supply` |
| department | string | No | User's department |

---

### POST `/api/auth/login`
Authenticate and receive a JWT access token.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@ims.com\",\"password\":\"admin123\"}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email |
| password | string | Yes | User's password |

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@ims.com",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

---

### GET `/api/auth/me`
Get current authenticated user profile.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/auth/me
```

**Headers:**
| Header | Value | Required |
|--------|-------|----------|
| Authorization | Bearer `<token>` | Yes |

---

## Users

### GET `/api/users`
Get all users (requires authentication).

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/users
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| role | string | Filter by role (admin, sales, warehouse, supply) |
| is_active | boolean | Filter by active status |

---

### GET `/api/users/:id`
Get user by ID.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/users/1
```

---

### POST `/api/users`
Create a new user.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/users ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"John Doe\",\"email\":\"john@test.com\",\"password\":\"password123\",\"role\":\"sales\",\"department\":\"Sales\"}"
```

---

### PUT `/api/users/:id`
Update user information.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/users/1 ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Name\",\"role\":\"warehouse\",\"is_active\":true}"
```

---

### DELETE `/api/users/:id`
Delete a user.

**curl Command:**
```bash
curl.exe -X DELETE http://localhost:3000/api/users/5 -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Products

### GET `/api/products`
Get all products with optional filtering.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/products
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| category_id | number | Filter by category |
| supplier_id | number | Filter by supplier |
| is_active | boolean | Filter by active status |
| search | string | Search by name or SKU |

---

### GET `/api/products/:id`
Get product by ID with inventory info.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/products/1
```

---

### GET `/api/products/low-stock`
Get products where quantity is at or below reorder point.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/products/low-stock
```

---

### POST `/api/products`
Create a new product.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/products ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"New Product\",\"sku\":\"NEW-001\",\"price\":99.99,\"cost\":50.00,\"category_id\":1,\"supplier_id\":1,\"brand\":\"Test Brand\",\"description\":\"A test product\"}"
```

---

### PUT `/api/products/:id`
Update product information.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/products/1 ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Product\",\"price\":109.99,\"is_active\":true}"
```

---

### PUT `/api/products/bulk-price` (Admin Only)
Bulk update prices for multiple products.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/products/bulk-price ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"updates\":[{\"id\":1,\"price\":899.99},{\"id\":2,\"price\":999.99}]}"
```

---

### DELETE `/api/products/:id`
Delete a product (fails if it has inventory records).

**curl Command:**
```bash
curl.exe -X DELETE http://localhost:3000/api/products/1 -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Categories

### GET `/api/categories`
Get all categories.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/categories
```

---

### GET `/api/categories/tree`
Get category hierarchy (parent-child relationships).

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/categories/tree
```

---

### GET `/api/categories/:id`
Get category by ID.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/categories/1
```

---

### POST `/api/categories`
Create a new category.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/categories ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Smartphones\",\"parent_id\":1,\"description\":\"Mobile phones\"}"
```

---

### PUT `/api/categories/:id`
Update category information.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/categories/1 ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Electronics\",\"description\":\"Electronic devices\"}"
```

---

### DELETE `/api/categories/:id`
Delete a category (fails if it has child categories).

**curl Command:**
```bash
curl.exe -X DELETE http://localhost:3000/api/categories/1 -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Suppliers

### GET `/api/suppliers`
Get all suppliers.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/suppliers
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| is_active | boolean | Filter by active status |
| search | string | Search by name or contact person |

---

### GET `/api/suppliers/:id`
Get supplier by ID.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/suppliers/1
```

---

### POST `/api/suppliers`
Create a new supplier.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/suppliers ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"New Supplier\",\"contact_person\":\"Jane Doe\",\"phone\":\"555-1234\",\"email\":\"orders@supplier.com\",\"address\":\"123 Supply St\",\"tax_id\":\"TAX123\",\"payment_terms\":\"Net 30\",\"lead_time_days\":7,\"minimum_order\":100}"
```

---

### PUT `/api/suppliers/:id`
Update supplier information.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/suppliers/1 ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Supplier\",\"phone\":\"555-5678\",\"is_active\":true}"
```

---

### DELETE `/api/suppliers/:id`
Delete a supplier.

**curl Command:**
```bash
curl.exe -X DELETE http://localhost:3000/api/suppliers/1 -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Warehouses

### GET `/api/warehouses`
Get all warehouses.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/warehouses
```

---

### GET `/api/warehouses/:id`
Get warehouse by ID.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/warehouses/1
```

---

### POST `/api/warehouses`
Create a new warehouse.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/warehouses ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"New Warehouse\",\"location\":\"456 New Ave\",\"capacity\":5000}"
```

---

### PUT `/api/warehouses/:id`
Update warehouse information.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/warehouses/1 ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Warehouse\",\"capacity\":15000,\"is_active\":true}"
```

---

### DELETE `/api/warehouses/:id`
Delete a warehouse (fails if it has inventory).

**curl Command:**
```bash
curl.exe -X DELETE http://localhost:3000/api/warehouses/2 -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Inventory

### GET `/api/inventory/warehouse/:warehouseId`
Get inventory for a specific warehouse.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/inventory/warehouse/1
```

---

### GET `/api/inventory/low-stock`
Get all low stock inventory items.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/inventory/low-stock
```

---

### GET `/api/inventory/movements?product_id=:id`
Get stock movement history for a product.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" "http://localhost:3000/api/inventory/movements?product_id=1"
```

---

### GET `/api/inventory/reorder-suggestions`
Get auto-reorder suggestions based on sales velocity.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/inventory/reorder-suggestions
```

---

### POST `/api/inventory/receive`
Receive stock into inventory.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/inventory/receive ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"product_id\":1,\"warehouse_id\":1,\"quantity\":50,\"reason\":\"New shipment received\"}"
```

---

### POST `/api/inventory/transfer`
Transfer stock between warehouses.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/inventory/transfer ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"product_id\":1,\"from_warehouse_id\":1,\"to_warehouse_id\":2,\"quantity\":25,\"reason\":\"Warehouse redistribution\"}"
```

---

### POST `/api/inventory/adjust`
Adjust stock quantity (with reason code).

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/inventory/adjust ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"product_id\":1,\"warehouse_id\":1,\"new_quantity\":75,\"reason_code\":\"COUNT_ERROR\",\"notes\":\"Physical count correction\"}"
```

**Adjustment Reason Codes:**
| Code | Description | Requires Approval |
|------|-------------|-------------------|
| DAMAGE | Product damaged in warehouse | No |
| THEFT | Product stolen | Yes (Admin only) |
| COUNT_ERROR | Physical count mismatch | No |
| EXPIRED | Product reached expiration date | No |
| QUALITY_ISSUE | Quality control failure | Yes (Admin only) |
| RETURN_TO_SUPPLIER | Returning defective items | No |

---

## Sales Orders

### POST `/api/orders/sales`
Create a new sales order.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/orders/sales ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"customer_name\":\"John Doe\",\"customer_email\":\"john@example.com\",\"customer_phone\":\"555-1234\",\"shipping_address\":\"123 Customer St\",\"delivery_type\":\"delivery\",\"items\":[{\"product_id\":1,\"quantity\":2,\"unit_price\":999.99,\"warehouse_id\":1}]}"
```

---

### GET `/api/orders/sales`
Get all sales orders.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/orders/sales
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status |
| customer_name | string | Search by customer name |

---

### GET `/api/orders/sales/:id`
Get sales order by ID.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/orders/sales/1
```

---

### PUT `/api/orders/sales/:id/status`
Update sales order status.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/orders/sales/1/status ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"processing\"}"
```

**Valid Statuses:** `pending`, `processing`, `ready`, `in_transit`, `delivered`, `cancelled`

---

## Discount Approvals

### POST `/api/orders/sales/:id/discount-request`
Request discount approval for an order.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/orders/sales/1/discount-request ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"requested_discount\":15,\"reason\":\"Bulk purchase discount\"}"
```

---

### PUT `/api/orders/sales/:id/discount-approve` (Admin Only)
Approve or reject a discount request.

**curl Command (Approve):**
```bash
curl.exe -X PUT http://localhost:3000/api/orders/sales/1/discount-approve ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"approve\":true}"
```

**curl Command (Reject):**
```bash
curl.exe -X PUT http://localhost:3000/api/orders/sales/1/discount-approve ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"approve\":false}"
```

---

## Supply Orders

### POST `/api/orders/supply`
Create a new supply order (purchase order).

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/orders/supply ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"supplier_id\":1,\"expected_delivery\":\"2026-05-01\",\"items\":[{\"product_id\":1,\"product_name\":\"Galaxy S23\",\"quantity\":100,\"unit_price\":750.00}],\"subtotal\":75000,\"shipping_cost\":500}"
```

---

### GET `/api/orders/supply`
Get all supply orders.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/orders/supply
```

---

### GET `/api/orders/supply/:id`
Get supply order by ID.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/orders/supply/1
```

---

### POST `/api/orders/supply/:id/receive`
Receive a supply order and add stock to inventory.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/orders/supply/1/receive ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"warehouse_id\":1}"
```

---

## Reports

### GET `/api/reports/sales` (Admin/Sales)
Generate sales report.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" "http://localhost:3000/api/reports/sales?start_date=2026-01-01&end_date=2026-12-31"
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| start_date | string | Filter by start date (ISO format) |
| end_date | string | Filter by end date (ISO format) |
| format | string | `json` or `pdf` |

---

### GET `/api/reports/inventory` (Admin/Warehouse)
Generate inventory report.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" "http://localhost:3000/api/reports/inventory?warehouse_id=1"
```

---

### GET `/api/reports/suppliers` (Admin/Supply)
Generate supplier performance report.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/reports/suppliers
```

---

## Export (Admin Only)

### GET `/api/export/users`
Export users to CSV.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/export/users --output users.csv
```

---

### GET `/api/export/products`
Export products to CSV.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/export/products --output products.csv
```

---

### GET `/api/export/inventory`
Export inventory to CSV.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/export/inventory --output inventory.csv
```

---

## Credentials Management

### View All Credentials
Run this command anytime to see all system credentials:

```bash
npm run show-creds
```

Credentials are also printed automatically on server startup.

---

### Reset Password
To reset any user's password:

```bash
npm run reset-password admin@ims.com admin123
```

Usage: `npm run reset-password <email> <newPassword>`

---

### Default Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ims.com | admin123 |
| Sales | sales@ims.com | sales123 |
| Warehouse | warehouse@ims.com | warehouse123 |
| Supply | supply@ims.com | supply123 |

---

## Quick Reference Summary

| Module | Endpoints | Methods |
|--------|-----------|---------|
| Health | 1 | GET |
| Auth | 3 | POST, POST, GET |
| Users | 5 | GET, GET, POST, PUT, DELETE |
| Products | 7 | GET, GET, GET, POST, PUT, DELETE, PUT (bulk) |
| Categories | 6 | GET, GET, GET, POST, PUT, DELETE |
| Suppliers | 5 | GET, GET, POST, PUT, DELETE |
| Warehouses | 5 | GET, GET, POST, PUT, DELETE |
| Inventory | 7 | GET(3), POST(3), GET(suggestions) |
| Sales Orders | 4 | POST, GET, GET, PUT |
| Discount Approvals | 2 | POST, PUT |
| Supply Orders | 4 | POST, GET, GET, POST |
| Reports | 3 | GET (3 reports) |
| Export | 3 | GET (3 exports) |
| **TOTAL** | **55** | |

---

## Notes

- All protected endpoints require a valid JWT token in the `Authorization: Bearer <token>` header
- JWT tokens expire after 24 hours and can be revoked on logout
- Passwords are hashed using bcrypt (10 rounds)
- All timestamps are in ISO 8601 format
- Monetary values are returned as decimal strings with 2 decimal places
- The system supports token blacklisting for logout functionality