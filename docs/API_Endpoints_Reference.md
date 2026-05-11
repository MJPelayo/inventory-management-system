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
14. [Audit Logs](#audit-logs)
15. [Dropdowns](#dropdowns)
16. [Payment Terms](#payment-terms)
17. [Permissions](#permissions)
18. [Settings](#settings)
19. [Messages](#messages)
20. [Requests](#requests)
21. [Notifications](#notifications)

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
  "timestamp": "2026-05-11T17:00:00.000Z"
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

### POST `/api/auth/refresh`
Refresh an existing JWT token.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/auth/refresh ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

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

### GET `/api/inventory/movements`
Get stock movement history for a product.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" "http://localhost:3000/api/inventory/movements?product_id=1"
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| product_id | number | Filter by product |
| limit | number | Limit results (default: 100) |

---

### GET `/api/inventory/reorder-suggestions`
Get auto-reorder suggestions based on sales velocity.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/inventory/reorder-suggestions
```

---

### GET `/api/inventory/product/:productId/warehouse/:warehouseId/location`
Get product location details in a warehouse.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/inventory/product/1/warehouse/1/location
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

### POST `/api/orders/supply/:id/cancel` (Supply/Admin Only)
Cancel a supply order.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/orders/supply/1/cancel ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
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

---

### GET `/api/reports/inventory` (Admin/Warehouse)
Generate inventory report.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" "http://localhost:3000/api/reports/inventory?warehouse_id=1"
```

---

### GET `/api/reports/inventory/export` (Admin/Warehouse)
Export inventory report as CSV.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" "http://localhost:3000/api/reports/inventory/export" --output inventory-report.csv
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

## Audit Logs (Admin Only)

### GET `/api/audit-logs`
Get all audit logs with optional filtering.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" "http://localhost:3000/api/audit-logs?limit=50&offset=0"
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Number of records to return (default: 50) |
| offset | number | Offset for pagination |
| entity_type | string | Filter by entity type (user, product, inventory, etc.) |
| entity_id | number | Filter by specific entity ID |
| user_id | number | Filter by user who performed the action |
| action | string | Filter by action type (CREATE, UPDATE, DELETE) |

---

### GET `/api/audit-logs/entity/:entityType/:entityId`
Get audit logs for a specific entity.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/audit-logs/entity/product/1
```

**Example Entity Types:**
| Entity Type | Description |
|-------------|-------------|
| user | User account changes |
| product | Product catalog changes |
| inventory | Stock level changes |
| sales_order | Sales order modifications |
| supply_order | Purchase order modifications |

---

## Dropdowns

### GET `/api/dropdowns/all`
Get all dropdown data in one call.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/dropdowns/all
```

**Response includes:** payment_terms, delivery_types, order_statuses, payment_statuses, user_roles, shipping_methods

---

### GET `/api/dropdowns/payment-terms`
Get payment terms dropdown.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/dropdowns/payment-terms
```

---

### GET `/api/dropdowns/delivery-types`
Get delivery types dropdown.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/dropdowns/delivery-types
```

---

### GET `/api/dropdowns/order-statuses`
Get order statuses dropdown.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/dropdowns/order-statuses
```

---

### GET `/api/dropdowns/payment-statuses`
Get payment statuses dropdown.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/dropdowns/payment-statuses
```

---

### GET `/api/dropdowns/user-roles`
Get user roles dropdown.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/dropdowns/user-roles
```

---

### GET `/api/dropdowns/shipping-methods`
Get shipping methods dropdown.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/dropdowns/shipping-methods
```

---

## Payment Terms

### GET `/api/payment-terms`
Get all payment terms.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/payment-terms
```

---

### GET `/api/payment-terms/:id`
Get payment term by ID.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/payment-terms/1
```

---

## Permissions (Admin Only)

### GET `/api/permissions/users/:id/permissions`
Get user permissions.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/permissions/users/1/permissions
```

---

### PUT `/api/permissions/users/:id/permissions`
Update user permissions.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/permissions/users/1/permissions ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"module\":\"products\",\"permission\":\"edit\"}"
```

---

### POST `/api/permissions/users/:id/permissions/reset`
Reset user permissions to role defaults.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/permissions/users/1/permissions/reset ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### GET `/api/permissions/settings/role-defaults`
Get role default permissions.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/permissions/settings/role-defaults
```

---

### PUT `/api/permissions/settings/role-defaults`
Update role default permissions.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/permissions/settings/role-defaults ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"role\":\"sales\",\"module\":\"products\",\"permission\":\"read\"}"
```

---

### GET `/api/permissions/audit/permissions`
Get permission change history.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/permissions/audit/permissions
```

---

### GET `/api/audit/permissions`
Alias for permission audit log.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/audit/permissions
```

---

## Settings (Admin Only)

### GET `/api/settings/system`
Get all system settings.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/settings/system
```

---

### GET `/api/settings/system/:key`
Get single system setting.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/settings/system/session_timeout
```

---

### PUT `/api/settings/system`
Update system settings.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/settings/system ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"setting_key\":\"session_timeout\",\"setting_value\":\"1440\",\"setting_type\":\"integer\",\"description\":\"Session timeout in minutes\"}"
```

---

## Messages

### GET `/api/messages`
Get user's messages (sent and received).

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/messages
```

---

### POST `/api/messages`
Send a new message.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/messages ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"recipient_id\":2,\"subject\":\"Question\",\"message\":\"Hello, can you help me?\"}"
```

---

### GET `/api/messages/unread`
Get unread message count.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/messages/unread
```

---

### PUT `/api/messages/:id/read`
Mark message as read.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/messages/1/read ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### GET `/api/messages/conversation/:userId`
Get conversation with specific user.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/messages/conversation/2
```

---

## Requests

### GET `/api/requests`
Get all requests (filtered by role).

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/requests
```

---

### GET `/api/requests/my`
Get requests made by current user.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/requests/my
```

---

### POST `/api/requests`
Create a new request.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/requests ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"request_type\":\"deletion\",\"entity_type\":\"product\",\"entity_id\":5,\"reason\":\"Product discontinued\"}"
```

---

### POST `/api/requests/:id/approve` (Admin Only)
Approve a request.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/requests/1/approve ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### POST `/api/requests/:id/deny` (Admin Only)
Deny a request.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/requests/1/deny ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Notifications

### GET `/api/notifications`
Get user notifications.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/notifications
```

---

### GET `/api/notifications/unread/count`
Get unread notification count.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/notifications/unread/count
```

---

### PUT `/api/notifications/:id/read`
Mark notification as read.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/notifications/1/read ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### PUT `/api/notifications/read/all`
Mark all notifications as read.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/notifications/read/all ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
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
| Auth | 4 | POST(2), GET, POST(refresh) |
| Users | 5 | GET(2), POST, PUT, DELETE |
| Products | 7 | GET(3), POST, PUT(2), DELETE |
| Categories | 6 | GET(3), POST, PUT, DELETE |
| Suppliers | 5 | GET(2), POST, PUT, DELETE |
| Warehouses | 5 | GET(2), POST, PUT, DELETE |
| Inventory | 8 | GET(5), POST(3) |
| Sales Orders | 4 | POST, GET(2), PUT |
| Discount Approvals | 2 | POST, PUT |
| Supply Orders | 5 | POST, GET(2), POST(2) |
| Reports | 4 | GET(4) |
| Export | 3 | GET(3) |
| Audit Logs | 2 | GET(2) |
| Dropdowns | 7 | GET(7) |
| Payment Terms | 2 | GET(2) |
| Permissions | 7 | GET(4), PUT, POST(2) |
| Settings | 3 | GET(2), PUT |
| Messages | 5 | GET(3), POST, PUT |
| Requests | 5 | GET(2), POST(3) |
| Notifications | 4 | GET(2), PUT(2) |
| **TOTAL** | **95** | |

---

## Notes

- All protected endpoints require a valid JWT token in the `Authorization: Bearer <token>` header
- JWT tokens expire after 24 hours and can be revoked on logout
- Token refresh is available via `/api/auth/refresh` endpoint
- Passwords are hashed using bcrypt (10 rounds)
- All timestamps are in ISO 8601 format
- Monetary values are returned as decimal strings with 2 decimal places
- The system supports token blacklisting for logout functionality
- Role-based access control (RBAC) is enforced on all protected endpoints
- Input sanitization and SQL injection protection middleware is applied globally