# UML Diagrams for Inventory Management System

## Class Diagram

```mermaid
classDiagram
    class BaseModel {
        <<abstract>>
        -tableName: string
        -id: number
        -created_at: Date
        -updated_at: Date
        +save() Promise~T~
        +static findById(id) Promise~T~
        +static findAll(filters) Promise~T[]~
        +static deleteById(id) Promise~boolean~
        +_hydrate(data) T
        +toJSON() object
    }

    class User {
        -id: number
        -name: string
        -email: string
        -password_hash: string
        -role: string
        -department: string
        -sales_target: number
        -warehouse_id: number
        -purchase_budget: number
        -is_active: boolean
        -last_login: Date
        -is_protected: boolean
        +getName() string
        +getEmail() string
        +getRole() string
        +isActive() boolean
        +canPerformAction(action) boolean
        +updateLastLogin() void
        +toJSON() object
    }

    class Product {
        -id: number
        -name: string
        -description: string
        -sku: string
        -price: number
        -cost: number
        -category_id: number
        -supplier_id: number
        -brand: string
        -image_url: string
        -is_active: boolean
        +getName() string
        +getSku() string
        +getPrice() number
        +getProfitMargin() number
        +applyDiscount(percentage) number
        +getInventory() Promise~Array~
        +toJSON() object
    }

    class Category {
        -id: number
        -name: string
        -parent_id: number
        -description: string
        +getFullPath() Promise~string~
        +getChildren() Promise~Category[]~
        +getTree() static Promise~Array~
        +toJSON() object
    }

    class Supplier {
        -id: number
        -name: string
        -contact_person: string
        -phone: string
        -email: string
        -address: string
        -tax_id: string
        -payment_term_id: number
        -lead_time_days: number
        -minimum_order: number
        -is_active: boolean
        +getName() string
        +getPaymentTerm() Promise~PaymentTerm~
        +getProducts(limit) Promise~Array~
        +getPurchaseOrderHistory(limit) Promise~Array~
        +toJSON() object
    }

    class Warehouse {
        -id: number
        -name: string
        -location: string
        -capacity: number
        -current_occupancy: number
        -is_active: boolean
        +getUtilization() number
        +hasCapacity(additionalUnits) boolean
        +updateOccupancy() Promise~void~
        +toJSON() object
    }

    class Inventory {
        -id: number
        -product_id: number
        -warehouse_id: number
        -quantity: number
        -reorder_point: number
        -max_stock: number
        +getQuantity() number
        +isLowStock() boolean
        +isOutOfStock() boolean
        +canFulfill(quantity) boolean
        +static findByProductAndWarehouse(productId, warehouseId) Promise~Inventory~
        +static findByWarehouse(warehouseId) Promise~Inventory[]~
        +static getLowStock() Promise~Inventory[]~
        +toJSON() object
    }

    class SalesOrder {
        -id: number
        -order_number: string
        -customer_name: string
        -customer_email: string
        -customer_phone: string
        -shipping_address: string
        -delivery_type: string
        -status: string
        -payment_status: string
        -subtotal: number
        -discount_amount: number
        -discount_approved_by: number
        -tax: number
        -shipping_cost: number
        -total_amount: number
        -created_by: number
        -items: Array
        +calculateTotal() void
        +reserveStock() Promise~void~
        +updateStatus(status) void
        +toJSON() object
    }

    class SupplyOrder {
        -id: number
        -po_number: string
        -supplier_id: number
        -status: string
        -order_date: Date
        -expected_delivery: Date
        -actual_delivery: Date
        -subtotal: number
        -shipping_cost: number
        -total_amount: number
        -created_by: number
        -items: Array
        +generatePONumber() string
        +calculateTotal() void
        +receiveStock(warehouseId, performedBy) Promise~void~
        +toJSON() object
    }

    class StockMovement {
        -id: number
        -product_id: number
        -warehouse_id: number
        -quantity_change: number
        -movement_type: string
        -reason: string
        -reference_number: string
        -performed_by: number
        -created_at: Date
        +record() Promise~StockMovement~
        +static getProductHistory(productId, limit) Promise~Array~
        +toJSON() object
    }

    class AuditLog {
        -user_id: number
        -action: string
        -entity_type: string
        -entity_id: number
        -old_data: Object
        -new_data: Object
        -ip_address: string
        -user_agent: string
        -created_at: Date
        +save() Promise~Object~
        +static getRecent(limit) Promise~Array~
        +static getForEntity(entityType, entityId) Promise~Array~
        +toJSON() object
    }

    class PaymentTerm {
        -id: number
        -term_code: string
        -term_name: string
        -days: number
        -description: string
        -sort_order: number
        -is_active: boolean
        +static findAll(activeOnly) Promise~PaymentTerm[]~
        +static findById(id) Promise~PaymentTerm~
        +toJSON() object
    }

    class DeliveryType {
        -id: number
        -type_code: string
        -type_name: string
        -requires_address: boolean
        -icon: string
        -sort_order: number
        -is_active: boolean
        +static findAll(activeOnly) Promise~DeliveryType[]~
        +toJSON() object
    }

    class OrderStatus {
        -id: number
        -status_code: string
        -status_name: string
        -color: string
        -sort_order: number
        -is_active: boolean
        +static findAll(activeOnly) Promise~OrderStatus[]~
        +static getByCode(code) Promise~OrderStatus~
        +toJSON() object
    }

    class PaymentStatus {
        -id: number
        -status_code: string
        -status_name: string
        -color: string
        -sort_order: number
        -is_active: boolean
        +static findAll(activeOnly) Promise~PaymentStatus[]~
        +toJSON() object
    }

    class ShippingMethod {
        -id: number
        -method_code: string
        -method_name: string
        -base_cost: number
        -estimated_days: number
        -sort_order: number
        -is_active: boolean
        +static findAll(activeOnly) Promise~ShippingMethod[]~
        +toJSON() object
    }

    class UserRole {
        -id: number
        -role_code: string
        -role_name: string
        -description: string
        -sort_order: number
        -is_active: boolean
        +static findAll(activeOnly) Promise~UserRole[]~
        +static getByCode(code) Promise~UserRole~
        +toJSON() object
    }

    BaseModel <|-- User : extends
    BaseModel <|-- Product : extends
    BaseModel <|-- Supplier : extends

    User "1" --> "*" SalesOrder : creates
    User "1" --> "*" SupplyOrder : creates
    User "1" --> "*" StockMovement : performs
    User "1" --> "*" AuditLog : generates

    Product "1" --> "*" Inventory : has stock in
    Product "1" --> "*" StockMovement : tracked by
    Product "1" --> "1" Category : belongs to
    Product "1" --> "1" Supplier : supplied by

    Category "1" --> "*" Category : parent-child hierarchy

    Warehouse "1" --> "*" Inventory : contains
    Warehouse "1" --> "*" StockMovement : records in

    Inventory "1" --> "1" Product : tracks
    Inventory "1" --> "1" Warehouse : located at

    SalesOrder "1" --> "*" Product : contains via items
    SalesOrder "1" --> "1" User : created by

    SupplyOrder "1" --> "1" Supplier : orders from
    SupplyOrder "1" --> "*" Product : receives
    SupplyOrder "1" --> "1" User : created by

    StockMovement "1" --> "1" Product : affects
    StockMovement "1" --> "1" Warehouse : occurs at
    StockMovement "1" --> "1" User : performed by

    Supplier "1" --> "*" PaymentTerm : has payment terms
```

## Sequence Diagrams

### 1. User Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant UserModel
    participant Middleware
    participant Database

    Client->>AuthController: POST /api/auth/login (email, password)
    AuthController->>UserModel: findByEmail(email)
    UserModel->>Database: SELECT * FROM users WHERE email = ?
    Database-->>UserModel: User record
    UserModel-->>AuthController: User instance
    
    AuthController->>AuthController: bcrypt.compare(password, hash)
    AuthController->>Middleware: generateToken(id, email, role)
    Middleware-->>AuthController: JWT token
    
    AuthController-->>Client: { success, data: { user, token } }
    
    Note over Client,Database: Subsequent protected requests
    Client->>Middleware: Authorization: Bearer <token>
    Middleware->>Middleware: jwt.verify(token, JWT_SECRET)
    Middleware->>UserModel: findById(decoded.id)
    UserModel->>Database: SELECT * FROM users WHERE id = ?
    Database-->>UserModel: User record
    UserModel-->>Middleware: User instance
    Middleware->>Middleware: Check role authorization
    Middleware-->>Client: Proceed to controller (or 403)
```

### 2. Sales Order Creation Flow

```mermaid
sequenceDiagram
    participant Client
    participant OrderController
    participant SalesOrder
    participant Inventory
    participant StockMovement
    participant Database

    Client->>OrderController: POST /api/orders/sales
    OrderController->>SalesOrder: new SalesOrder(data)
    OrderController->>SalesOrder: reserveStock()
    
    activate Database
    SalesOrder->>Database: BEGIN transaction
    
    loop For each order item
        SalesOrder->>Inventory: Check quantity
        Inventory->>Database: SELECT quantity FROM inventory
        Database-->>SalesOrder: Available stock
        
        alt Sufficient stock
            SalesOrder->>Database: UPDATE inventory SET quantity = quantity - N
            SalesOrder->>StockMovement: Record 'sold' movement
            StockMovement->>Database: INSERT INTO stock_movements
        else Insufficient stock
            SalesOrder-->>SalesOrder: Throw error
        end
    end
    
    SalesOrder->>Database: COMMIT transaction
    deactivate Database
    
    SalesOrder->>Database: INSERT INTO sales_orders
    Database-->>SalesOrder: Saved order with ID
    
    OrderController-->>Client: { success, data: order }
```

### 3. Stock Transfer Flow

```mermaid
sequenceDiagram
    participant Client
    participant InventoryController
    participant Inventory
    participant StockMovement
    participant Database

    Client->>InventoryController: POST /api/inventory/transfer
    InventoryController->>Inventory: findByProductAndWarehouse(product_id, from_wh)
    Inventory->>Database: SELECT * FROM inventory
    Database-->>Inventory: Source inventory record
    
    alt Sufficient stock
        InventoryController->>Database: BEGIN transaction
        
        InventoryController->>Database: UPDATE inventory (source -N)
        InventoryController->>Database: INSERT/UPDATE inventory (dest +N)
        
        InventoryController->>StockMovement: Record outgoing movement
        StockMovement->>Database: INSERT INTO stock_movements (type: transferred)
        
        InventoryController->>StockMovement: Record incoming movement
        StockMovement->>Database: INSERT INTO stock_movements (type: transferred)
        
        InventoryController->>Database: COMMIT transaction
        InventoryController-->>Client: { success, message }
    else Insufficient stock
        InventoryController-->>Client: { error: Insufficient stock }
    end
```

## Component Diagram

```mermaid
componentDiagram
    component "Client Layer\n(Browser/Mobile)" as Client
    
    component "Express.js API Layer" as API {
        component "Routes" as Routes
        component "Controllers" as Controllers
        component "Middleware" as Middleware {
            component "auth.js\n(JWT + RBAC)" as AuthMW
            component "permissions.js\n(Module permissions)" as PermMW
            component "sanitize.js" as SanitizeMW
            component "security.js\n(SQL injection)" as SecurityMW
        }
    }
    
    component "Business Logic Layer" as Models {
        component "BaseModel" as BaseModel
        component "User" as User
        component "Product" as Product
        component "Inventory" as Inventory
        component "SalesOrder" as SalesOrder
        component "SupplyOrder" as SupplyOrder
        component "StockMovement" as StockMov
        component "AuditLog" as AuditLog
    }
    
    component "Data Access Layer" as DAL {
        component "Connection Pool" as Pool
        component "Query Builder" as QB
    }
    
    database "PostgreSQL Database" as DB
    
    Client --> Routes : HTTP Request
    Routes --> Middleware : Route matching
    Middleware --> Controllers : Authenticated request
    Controllers --> Models : Business logic
    Models --> DAL : Data operations
    DAL --> Pool : Acquire connection
    Pool --> DB : Execute query
    DB --> Pool : Return results
    Pool --> DAL : Result rows
    DAL --> Models : Hydrated objects
    Models --> Controllers : Processed data
    Controllers --> Routes : JSON response
    Routes --> Client : HTTP Response
```

## Deployment Diagram

```mermaid
deploymentDiagram
    node "Client Devices" {
        node "Web Browser" as Browser
        node "Mobile App" as Mobile
    }
    
    node "Application Server" {
        artifact "Node.js Runtime" as NodeJS {
            artifact "Express.js App" as ExpressApp
            artifact "JWT Middleware" as JWT
            artifact "Model Classes" as Models
        }
    }
    
    node "Database Server" {
        artifact "PostgreSQL" as PostgreSQL {
            database "inventory_db" as InvDB
        }
    }
    
    Browser --> ExpressApp : HTTPS / JSON
    Mobile --> ExpressApp : HTTPS / JSON
    ExpressApp --> JWT : Token verification
    ExpressApp --> Models : Business logic
    Models --> InvDB : SQL queries via pg pool