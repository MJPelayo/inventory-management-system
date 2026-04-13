# UML Diagrams for Inventory Management System

## Class Diagram

```mermaid
classDiagram
    class User {
        -id: number
        -name: string
        -email: string
        -password_hash: string
        -role: string
        -is_active: boolean
        -created_at: Date
        -updated_at: Date
        +getName(): string
        +setName(name): void
        +getEmail(): string
        +setEmail(email): void
        +canPerformAction(action): boolean
        +save(): Promise~User~
        +findById(id): Promise~User~
        +findByEmail(email): Promise~User~
        +findAll(filters): Promise~User[]~
        +deleteById(id): Promise~boolean~
        +toJSON(): object
    }

    class Product {
        -id: number
        -name: string
        -sku: string
        -price: number
        -cost: number
        -category_id: number
        -supplier_id: number
        -is_active: boolean
        +getName(): string
        +setName(name): void
        +getPrice(): number
        +setPrice(price): void
        +getProfitMargin(): number
        +applyDiscount(percentage): number
        +save(): Promise~Product~
        +findById(id): Promise~Product~
        +findBySku(sku): Promise~Product~
        +findAll(filters): Promise~Product[]~
        +deleteById(id): Promise~boolean~
        +getInventory(): Promise~Array~
        +toJSON(): object
    }

    class Category {
        -id: number
        -name: string
        -parent_id: number
        -description: string
        +getFullPath(): string
        +getChildren(): Promise~Category[]~
        +save(): Promise~Category~
    }

    class Supplier {
        -id: number
        -name: string
        -contact_person: string
        -phone: string
        -email: string
        -rating: number
        +getPerformance(): object
        +save(): Promise~Supplier~
    }

    class Warehouse {
        -id: number
        -name: string
        -location: string
        -capacity: number
        +getUtilization(): number
        +save(): Promise~Warehouse~
    }

    class Inventory {
        -id: number
        -product_id: number
        -warehouse_id: number
        -quantity: number
        -reorder_point: number
        +isLowStock(): boolean
        +addStock(quantity): void
        +removeStock(quantity): void
        +save(): Promise~Inventory~
    }

    class SalesOrder {
        -id: number
        -order_number: string
        -customer_name: string
        -status: string
        -total_amount: number
        +calculateTotal(): number
        +applyDiscount(amount): void
        +updateStatus(status): void
        +save(): Promise~SalesOrder~
    }

    class StockMovement {
        -id: number
        -product_id: number
        -quantity_change: number
        -movement_type: string
        +record(): Promise~StockMovement~
    }

    User "1" --> "*" SalesOrder : creates
    User "1" --> "*" StockMovement : performs
    Product "1" --> "*" Inventory : has
    Warehouse "1" --> "*" Inventory : contains
    Category "1" --> "*" Product : categorizes
    Supplier "1" --> "*" Product : supplies
    Product "1" --> "*" StockMovement : tracked_in
    SalesOrder "1" --> "*" Product : contains