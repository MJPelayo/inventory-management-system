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
9. [Orders](#orders)

---

## Health Check

### GET `/api/health`
Check if the server is running and healthy.

**Description:** Returns server status and current timestamp.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-04-16T01:00:00.000Z"
}
```

---

## Authentication

### POST `/api/auth/register`
Register a new user account.

**Description:** Creates a new user with the specified role.

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
| password | string | Yes | User's password |
| role | string | Yes | User role: `admin`, `sales`, `warehouse`, or `supply` |
| department | string | No | User's department |

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 7,
    "name": "New User",
    "email": "newuser@test.com",
    "role": "sales",
    ...
  },
  "message": "User registered successfully"
}
```

---

### POST `/api/auth/login`
Authenticate and receive an access token.

**Description:** Logs in a user and returns a session token.

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
    "token": "MTphZG1pbkBpbXMuY29t"
  },
  "message": "Login successful"
}
```

---

### GET `/api/auth/me`
Get current authenticated user.

**Description:** Returns the profile of the currently logged-in user.

**curl Command:**
```bash
curl.exe -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/auth/me
```

**Headers:**
| Header | Value | Required |
|--------|-------|----------|
| Authorization | Bearer `<token>` | Yes |

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@ims.com",
    "role": "admin",
    ...
  }
}
```

---

## Users

### GET `/api/users`
Get all users.

**Description:** Retrieves a list of all users in the system.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/users
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| role | string | Filter by role (admin, sales, warehouse, supply) |
| is_active | boolean | Filter by active status |

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Admin User",
      "email": "admin@ims.com",
      "role": "admin",
      ...
    }
  ],
  "count": 5,
  "message": "Users retrieved successfully"
}
```

---

### GET `/api/users/:id`
Get user by ID.

**Description:** Retrieves a specific user's information.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/users/1
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@ims.com",
    "role": "admin",
    ...
  },
  "message": "User retrieved successfully"
}
```

---

### POST `/api/users`
Create a new user.

**Description:** Creates a new user account (admin only).

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/users ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"John Doe\",\"email\":\"john@test.com\",\"password\":\"123\",\"role\":\"sales\",\"department\":\"Sales\"}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | User's full name |
| email | string | Yes | User's email |
| password | string | Yes | User's password |
| role | string | Yes | User role |
| department | string | No | Department |
| sales_target | number | No | Sales target amount |
| warehouse_id | number | No | Associated warehouse ID |

**Expected Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "User created successfully"
}
```

---

### PUT `/api/users/:id`
Update user information.

**Description:** Updates an existing user's details.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/users/1 ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Name\",\"role\":\"warehouse\",\"is_active\":true}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | New name |
| email | string | No | New email |
| role | string | No | New role |
| is_active | boolean | No | Active status |
| department | string | No | Department |
| sales_target | number | No | Sales target |

**Expected Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "User updated successfully"
}
```

---

### DELETE `/api/users/:id`
Delete a user.

**Description:** Removes a user from the system.

**curl Command:**
```bash
curl.exe -X DELETE http://localhost:3000/api/users/5
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## Products

### GET `/api/products`
Get all products.

**Description:** Retrieves all products with optional filtering.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/products
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| category_id | number | Filter by category |
| supplier_id | number | Filter by supplier |
| is_active | boolean | Filter by active status |
| search | string | Search by name or SKU |

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Galaxy S23",
      "sku": "SAM-GS23",
      "price": "999.99",
      "cost": "750.00",
      "profit_margin": 24.99,
      ...
    }
  ],
  "count": 5
}
```

---

### GET `/api/products/:id`
Get product by ID.

**Description:** Retrieves a specific product with inventory info.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/products/1
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Galaxy S23",
    "sku": "SAM-GS23",
    "price": "999.99",
    "inventory": [...]
  }
}
```

---

### GET `/api/products/low-stock`
Get low stock products.

**Description:** Returns products where quantity is at or below reorder point.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/products/low-stock
```

**Expected Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 0
}
```

---

### POST `/api/products`
Create a new product.

**Description:** Adds a new product to the catalog.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/products ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"New Product\",\"sku\":\"NEW-001\",\"price\":99.99,\"cost\":50.00,\"category_id\":1,\"supplier_id\":1,\"brand\":\"Test Brand\",\"description\":\"A test product\"}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Product name |
| sku | string | Yes | Unique SKU code |
| price | number | Yes | Selling price |
| cost | number | Yes | Cost price |
| category_id | number | No | Category ID |
| supplier_id | number | No | Supplier ID |
| brand | string | No | Brand name |
| description | string | No | Product description |

**Expected Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### PUT `/api/products/:id`
Update product information.

**Description:** Updates an existing product's details.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/products/1 ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Product\",\"price\":109.99,\"is_active\":true}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | New name |
| price | number | No | New price |
| cost | number | No | New cost |
| category_id | number | No | Category ID |
| supplier_id | number | No | Supplier ID |
| brand | string | No | Brand name |
| is_active | boolean | No | Active status |

**Expected Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### DELETE `/api/products/:id`
Delete a product.

**Description:** Removes a product from the catalog.

**curl Command:**
```bash
curl.exe -X DELETE http://localhost:3000/api/products/1
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

## Categories

### GET `/api/categories`
Get all categories.

**Description:** Retrieves all product categories.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/categories
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Electronics",
      "parent_id": null,
      "description": null
    }
  ],
  "count": 4
}
```

---

### GET `/api/categories/tree`
Get category hierarchy.

**Description:** Returns categories in a tree structure showing parent-child relationships.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/categories/tree
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Electronics",
      "parent_id": null,
      "children": [
        {"id": 2, "name": "Phones", ...},
        {"id": 3, "name": "Laptops", ...}
      ]
    }
  ]
}
```

---

### GET `/api/categories/:id`
Get category by ID.

**Description:** Retrieves a specific category.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/categories/1
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Electronics",
    "parent_id": null,
    ...
  }
}
```

---

### POST `/api/categories`
Create a new category.

**Description:** Adds a new category (can be a subcategory).

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/categories ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Smartphones\",\"parent_id\":2,\"description\":\"Mobile phones\"}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Category name |
| parent_id | number | No | Parent category ID (for subcategories) |
| description | string | No | Category description |

**Expected Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### PUT `/api/categories/:id`
Update category information.

**Description:** Updates an existing category.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/categories/1 ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Electronics\",\"description\":\"Electronic devices and accessories\"}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | New name |
| parent_id | number | No | Parent category ID |
| description | string | No | Description |

**Expected Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### DELETE `/api/categories/:id`
Delete a category.

**Description:** Removes a category (fails if it has children).

**curl Command:**
```bash
curl.exe -X DELETE http://localhost:3000/api/categories/1
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

---

## Suppliers

### GET `/api/suppliers`
Get all suppliers.

**Description:** Retrieves all registered suppliers.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/suppliers
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| is_active | boolean | Filter by active status |
| search | string | Search by name or contact person |

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Samsung Electronics",
      "contact_person": "John Kim",
      "phone": "555-0100",
      "email": "orders@samsung.com",
      ...
    }
  ],
  "count": 3
}
```

---

### GET `/api/suppliers/:id`
Get supplier by ID.

**Description:** Retrieves a specific supplier's details.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/suppliers/1
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Samsung Electronics",
    ...
  }
}
```

---

### POST `/api/suppliers`
Create a new supplier.

**Description:** Adds a new supplier to the database.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/suppliers ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"New Supplier\",\"contact_person\":\"Jane Doe\",\"phone\":\"555-1234\",\"email\":\"orders@supplier.com\",\"address\":\"123 Supply St\",\"tax_id\":\"TAX123\",\"payment_terms\":\"Net 30\",\"lead_time_days\":7,\"minimum_order\":100}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Supplier name |
| contact_person | string | No | Contact person name |
| phone | string | No | Phone number |
| email | string | No | Email address |
| address | string | No | Physical address |
| tax_id | string | No | Tax identification number |
| payment_terms | string | No | Payment terms (e.g., "Net 30") |
| lead_time_days | number | No | Delivery lead time in days |
| minimum_order | number | No | Minimum order quantity |

**Expected Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### PUT `/api/suppliers/:id`
Update supplier information.

**Description:** Updates an existing supplier's details.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/suppliers/1 ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Supplier\",\"phone\":\"555-5678\",\"is_active\":true}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | New name |
| contact_person | string | No | Contact person |
| phone | string | No | Phone number |
| email | string | No | Email |
| address | string | No | Address |
| payment_terms | string | No | Payment terms |
| lead_time_days | number | No | Lead time |
| minimum_order | number | No | Minimum order |
| is_active | boolean | No | Active status |

**Expected Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### DELETE `/api/suppliers/:id`
Delete a supplier.

**Description:** Removes a supplier from the database.

**curl Command:**
```bash
curl.exe -X DELETE http://localhost:3000/api/suppliers/1
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Supplier deleted successfully"
}
```

---

## Warehouses

### GET `/api/warehouses`
Get all warehouses.

**Description:** Retrieves all warehouse locations.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/warehouses
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Main Warehouse",
      "location": "123 Main St, City",
      "capacity": 10000,
      "current_occupancy": 0,
      "utilization": 0,
      ...
    }
  ],
  "count": 2
}
```

---

### GET `/api/warehouses/:id`
Get warehouse by ID.

**Description:** Retrieves a specific warehouse's details.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/warehouses/1
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Main Warehouse",
    "location": "123 Main St, City",
    ...
  }
}
```

---

### POST `/api/warehouses`
Create a new warehouse.

**Description:** Adds a new warehouse location.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/warehouses ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"New Warehouse\",\"location\":\"456 New Ave\",\"capacity\":5000}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Warehouse name |
| location | string | No | Physical location |
| capacity | number | No | Storage capacity |

**Expected Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### PUT `/api/warehouses/:id`
Update warehouse information.

**Description:** Updates an existing warehouse's details.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/warehouses/1 ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Warehouse\",\"capacity\":15000,\"is_active\":true}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | New name |
| location | string | No | Location |
| capacity | number | No | Capacity |
| is_active | boolean | No | Active status |

**Expected Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### DELETE `/api/warehouses/:id`
Delete a warehouse.

**Description:** Removes a warehouse (fails if it has inventory).

**curl Command:**
```bash
curl.exe -X DELETE http://localhost:3000/api/warehouses/2
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Warehouse deleted successfully"
}
```

---

## Inventory

### GET `/api/inventory/warehouse/:warehouseId`
Get warehouse inventory.

**Description:** Retrieves all inventory items for a specific warehouse.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/inventory/warehouse/1
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": 1,
      "warehouse_id": 1,
      "quantity": 50,
      "reorder_point": 10,
      "max_stock": 200,
      "is_low_stock": false,
      "is_out_of_stock": false
    }
  ],
  "count": 4
}
```

---

### GET `/api/inventory/low-stock`
Get low stock items.

**Description:** Returns inventory items at or below their reorder point.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/inventory/low-stock
```

**Expected Response:**
```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

---

### GET `/api/inventory/movements`
Get stock movement history.

**Description:** Retrieves the audit trail of stock movements for a product.

**curl Command:**
```bash
curl.exe "http://localhost:3000/api/inventory/movements?product_id=1"
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| product_id | number | Yes | Product ID to get history for |

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": 1,
      "warehouse_id": 1,
      "quantity_change": 50,
      "movement_type": "received",
      "reason": "Initial stock",
      "performed_by_name": "Admin User",
      "created_at": "2026-04-16T01:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### POST `/api/inventory/receive`
Receive stock into inventory.

**Description:** Adds stock to an existing inventory item and records the movement.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/inventory/receive ^
  -H "Content-Type: application/json" ^
  -d "{\"product_id\":1,\"warehouse_id\":1,\"quantity\":50,\"reason\":\"New shipment received\"}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| product_id | number | Yes | Product ID |
| warehouse_id | number | Yes | Warehouse ID |
| quantity | number | Yes | Quantity to add |
| reason | string | No | Reason for receiving |

**Expected Response:**
```json
{
  "success": true,
  "message": "Stock received successfully"
}
```

---

### POST `/api/inventory/transfer`
Transfer stock between warehouses.

**Description:** Moves stock from one warehouse to another and records both movements.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/inventory/transfer ^
  -H "Content-Type: application/json" ^
  -d "{\"product_id\":1,\"from_warehouse_id\":1,\"to_warehouse_id\":2,\"quantity\":25,\"reason\":\"Warehouse redistribution\"}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| product_id | number | Yes | Product ID |
| from_warehouse_id | number | Yes | Source warehouse ID |
| to_warehouse_id | number | Yes | Destination warehouse ID |
| quantity | number | Yes | Quantity to transfer |
| reason | string | No | Reason for transfer |

**Expected Response:**
```json
{
  "success": true,
  "message": "Stock transferred successfully"
}
```

---

## Orders

### POST `/api/orders/sales`
Create a new sales order.

**Description:** Creates a new customer sales order and reserves stock.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/orders/sales ^
  -H "Content-Type: application/json" ^
  -d "{\"customer_name\":\"John Doe\",\"customer_email\":\"john@example.com\",\"customer_phone\":\"555-1234\",\"shipping_address\":\"123 Customer St\",\"delivery_type\":\"delivery\",\"items\":[{\"product_id\":1,\"quantity\":2,\"unit_price\":999.99,\"warehouse_id\":1}]}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| customer_name | string | Yes | Customer name |
| customer_email | string | No | Customer email |
| customer_phone | string | No | Customer phone |
| shipping_address | string | No | Shipping address |
| delivery_type | string | Yes | `delivery` or `pickup` |
| items | array | Yes | Array of order items |

**Item Object:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| product_id | number | Yes | Product ID |
| quantity | number | Yes | Quantity ordered |
| unit_price | number | Yes | Price per unit |
| warehouse_id | number | No | Warehouse to ship from |

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_number": "SO-1234567890-ABC123",
    "customer_name": "John Doe",
    "total_amount": 1999.98,
    ...
  },
  "message": "Order created successfully"
}
```

---

### GET `/api/orders/sales`
Get all sales orders.

**Description:** Retrieves all sales orders with optional filtering.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/orders/sales
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status |
| customer_name | string | Search by customer name |

**Expected Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 0
}
```

---

### GET `/api/orders/sales/:id`
Get sales order by ID.

**Description:** Retrieves a specific sales order with its items.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/orders/sales/1
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_number": "SO-1234567890-ABC123",
    "customer_name": "John Doe",
    "status": "pending",
    "items": [...]
  }
}
```

---

### PUT `/api/orders/sales/:id/status`
Update sales order status.

**Description:** Changes the status of a sales order.

**curl Command:**
```bash
curl.exe -X PUT http://localhost:3000/api/orders/sales/1/status ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"processing\"}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | Yes | New status: `pending`, `processing`, `ready`, `in_transit`, `delivered`, `cancelled` |

**Expected Response:**
```json
{
  "success": true,
  "message": "Order status updated to processing"
}
```

---

### POST `/api/orders/supply`
Create a new supply order.

**Description:** Creates a new purchase order to a supplier.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/orders/supply ^
  -H "Content-Type: application/json" ^
  -d "{\"supplier_id\":1,\"expected_delivery\":\"2026-05-01\",\"items\":[{\"product_id\":1,\"product_name\":\"Galaxy S23\",\"quantity\":100,\"unit_price\":750.00}],\"subtotal\":75000,\"shipping_cost\":500}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| supplier_id | number | Yes | Supplier ID |
| expected_delivery | string | No | Expected delivery date |
| items | array | Yes | Array of order items |
| subtotal | number | No | Order subtotal |
| shipping_cost | number | No | Shipping cost |

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "po_number": "PO-1234567890-XYZ789",
    "supplier_id": 1,
    "total_amount": 75500,
    ...
  },
  "message": "Purchase order created successfully"
}
```

---

### GET `/api/orders/supply`
Get all supply orders.

**Description:** Retrieves all purchase orders.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/orders/supply
```

**Expected Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 0
}
```

---

### GET `/api/orders/supply/:id`
Get supply order by ID.

**Description:** Retrieves a specific purchase order.

**curl Command:**
```bash
curl.exe http://localhost:3000/api/orders/supply/1
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "po_number": "PO-1234567890-XYZ789",
    "supplier_id": 1,
    "status": "pending",
    "items": [...]
  }
}
```

---

### POST `/api/orders/supply/:id/receive`
Receive a supply order.

**Description:** Marks a purchase order as received and adds stock to inventory.

**curl Command:**
```bash
curl.exe -X POST http://localhost:3000/api/orders/supply/1/receive ^
  -H "Content-Type: application/json" ^
  -d "{\"warehouse_id\":1}"
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| warehouse_id | number | Yes | Warehouse to receive stock at |

**Expected Response:**
```json
{
  "success": true,
  "message": "Purchase order received and stock updated"
}
```

---

## Quick Reference Summary

| Module | Endpoints | Methods |
|--------|-----------|---------|
| Health | 1 | GET |
| Auth | 3 | POST, POST, GET |
| Users | 5 | GET, GET, POST, PUT, DELETE |
| Products | 6 | GET, GET, GET, POST, PUT, DELETE |
| Categories | 6 | GET, GET, GET, POST, PUT, DELETE |
| Suppliers | 5 | GET, GET, POST, PUT, DELETE |
| Warehouses | 5 | GET, GET, POST, PUT, DELETE |
| Inventory | 5 | GET, GET, GET, POST, POST |
| Orders | 8 | POST, GET, GET, PUT, POST, GET, GET, POST |
| **TOTAL** | **44** | |

---

## Notes

- All timestamps are in ISO 8601 format
- All monetary values are returned as strings with 2 decimal places
- The `profit_margin` field in products is calculated as a percentage
- Token-based authentication is required for protected endpoints
- For Windows CMD, use `^` for line continuation; for PowerShell, use `` ` ``