-- =====================================================
-- INVENTORY MANAGEMENT SYSTEM - DATABASE SCHEMA
-- PostgreSQL for pgAdmin4
-- =====================================================

-- DROP TABLES IF EXISTS (for clean setup)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS sales_orders CASCADE;
DROP TABLE IF EXISTS supply_orders CASCADE;
DROP TABLE IF EXISTS product_locations CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ENUM TYPES
CREATE TYPE user_role AS ENUM ('admin', 'sales', 'warehouse', 'supply');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'ready', 'in_transit', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE movement_type AS ENUM ('received', 'sold', 'transferred', 'adjusted', 'returned');
CREATE TYPE permission_level AS ENUM ('none', 'read', 'create', 'edit', 'delete', 'full');

-- =====================================================
-- 1. users table
-- =====================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    department VARCHAR(100),
    sales_target DECIMAL(12,2),
    commission_rate DECIMAL(5,2) DEFAULT 5.0,
    warehouse_id INTEGER,
    shift VARCHAR(20),
    purchase_budget DECIMAL(12,2),
    is_active BOOLEAN DEFAULT TRUE,
    is_protected BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. categories (self-referential for hierarchy)
-- =====================================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. suppliers
-- =====================================================
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    tax_id VARCHAR(50) UNIQUE,
    payment_terms VARCHAR(50),
    lead_time_days INTEGER DEFAULT 7,
    minimum_order INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    on_time_deliveries INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. warehouses
-- =====================================================
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    capacity INTEGER DEFAULT 0,
    current_occupancy INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. products
-- =====================================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    sku VARCHAR(50) NOT NULL UNIQUE,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    cost DECIMAL(10,2) NOT NULL CHECK (cost >= 0),
    category_id INTEGER REFERENCES categories(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    brand VARCHAR(100),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 6. inventory (product + warehouse junction)
-- =====================================================
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reorder_point INTEGER DEFAULT 0,
    max_stock INTEGER DEFAULT 0,
    UNIQUE(product_id, warehouse_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 7. product_locations (no bins - aisle/side/shelf/layer)
-- =====================================================
CREATE TABLE product_locations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    aisle_number INTEGER NOT NULL,
    side VARCHAR(5) NOT NULL CHECK (side IN ('left', 'right')),
    shelf_number INTEGER NOT NULL,
    layer VARCHAR(10) NOT NULL CHECK (layer IN ('top', 'middle', 'middle2', 'middle3', 'bottom')),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    UNIQUE(product_id, warehouse_id, aisle_number, side, shelf_number, layer),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 8. sales_orders
-- =====================================================
CREATE TABLE sales_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(100),
    customer_phone VARCHAR(20),
    shipping_address TEXT,
    delivery_type VARCHAR(20) NOT NULL CHECK (delivery_type IN ('delivery', 'pickup')),
    status order_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    subtotal DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_approved_by INTEGER REFERENCES users(id),
    tax DECIMAL(10,2) DEFAULT 0,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 9. supply_orders
-- =====================================================
CREATE TABLE supply_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    status VARCHAR(20) DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_delivery TIMESTAMP,
    actual_delivery TIMESTAMP,
    subtotal DECIMAL(10,2) DEFAULT 0,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 10. order_items (polymorphic - both sales and supply)
-- =====================================================
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('sales', 'supply')),
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name VARCHAR(200),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 11. stock_movements (audit trail)
-- =====================================================
CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    quantity_change INTEGER NOT NULL,
    movement_type movement_type NOT NULL,
    reason TEXT,
    reference_number VARCHAR(100),
    performed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 12. discount_approvals
-- =====================================================
CREATE TABLE discount_approvals (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES sales_orders(id),
    requested_by INTEGER NOT NULL REFERENCES users(id),
    requested_discount DECIMAL(5,2) NOT NULL,
    reason TEXT,
    approved_by INTEGER REFERENCES users(id),
    approved BOOLEAN DEFAULT FALSE,
    approval_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CHECKPOINT 3 - NEW TABLES
-- =====================================================

-- 13. audit_logs - Track all user actions for security
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. product_requests - Sales team can request new products from Supply
CREATE TABLE IF NOT EXISTS product_requests (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    customer_name VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'normal',
    budget_limit DECIMAL(10,2),
    requested_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. adjustment_reasons - Standard reasons for stock adjustments
CREATE TABLE IF NOT EXISTS adjustment_reasons (
    id SERIAL PRIMARY KEY,
    reason_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    requires_approval BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Insert default adjustment reasons
INSERT INTO adjustment_reasons (reason_code, description, requires_approval) VALUES
('DAMAGE', 'Product damaged in warehouse - regular write-off', FALSE),
('THEFT', 'Product stolen - requires manager approval', TRUE),
('COUNT_ERROR', 'Physical count mismatch during inventory', FALSE),
('EXPIRED', 'Product reached expiration date', FALSE),
('QUALITY_ISSUE', 'Quality control failure - needs inspection', TRUE),
('RETURN_TO_SUPPLIER', 'Returning defective items to supplier', FALSE);

-- =====================================================
-- 16. internal_requests - Cross-role request system
-- =====================================================
CREATE TABLE IF NOT EXISTS internal_requests (
    id SERIAL PRIMARY KEY,
    request_type VARCHAR(50) NOT NULL, -- 'DELETE_SUPPLIER', 'DISCOUNT_APPROVAL', 'STOCK_ADJUSTMENT', 'PRODUCT_REQUEST'
    entity_type VARCHAR(50),
    entity_id INTEGER,
    entity_name VARCHAR(200),
    reason TEXT,
    requested_by INTEGER REFERENCES users(id),
    requested_by_name VARCHAR(100),
    target_role VARCHAR(50), -- 'admin', 'supply', 'warehouse', 'sales'
    status VARCHAR(20) DEFAULT 'pending',
    admin_notes TEXT,
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. internal_messages - Internal messaging/chat system
-- =====================================================
CREATE TABLE IF NOT EXISTS internal_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id),
    sender_name VARCHAR(100),
    sender_role VARCHAR(50),
    recipient_role VARCHAR(50), -- All, specific role, or specific user
    recipient_id INTEGER,
    subject VARCHAR(200),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 18. user_permissions - Granular permission controls per module
-- =====================================================
CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL, -- 'products', 'suppliers', 'warehouses', 'users', 'reports', 'orders', 'inventory'
    permission permission_level DEFAULT 'none',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, module)
);

-- =====================================================
-- 19. permission_audit_log - Track permission changes
-- =====================================================
CREATE TABLE IF NOT EXISTS permission_audit_log (
    id SERIAL PRIMARY KEY,
    changed_by INTEGER REFERENCES users(id),
    changed_for INTEGER REFERENCES users(id),
    module VARCHAR(50),
    old_permission permission_level,
    new_permission permission_level,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_name);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_timestamp ON stock_movements(created_at);
CREATE INDEX idx_product_locations_warehouse ON product_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_product_requests_status ON product_requests(status);
CREATE INDEX IF NOT EXISTS idx_product_requests_requested_by ON product_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON user_permissions(module);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_changed_for ON permission_audit_log(changed_for);

-- =====================================================
-- TRIGGER FUNCTION for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supply_orders_updated_at BEFORE UPDATE ON supply_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_permissions_updated_at BEFORE UPDATE ON user_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (for testing)
-- =====================================================
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@ims.com', 'admin123', 'admin'),
('Sales Manager', 'sales@ims.com', 'sales123', 'sales'),
('Warehouse Manager', 'warehouse@ims.com', 'warehouse123', 'warehouse'),
('Supply Manager', 'supply@ims.com', 'supply123', 'supply');

-- Mark admin as protected
UPDATE users SET is_protected = TRUE WHERE email = 'admin@ims.com';

-- =====================================================
-- DEFAULT PERMISSIONS FOR ROLES
-- =====================================================

-- Admin gets full access to all modules
INSERT INTO user_permissions (user_id, module, permission) SELECT id, module, 'full' FROM generate_series(1,1) AS u(id), (VALUES ('products'),('suppliers'),('warehouses'),('users'),('reports'),('orders'),('inventory')) AS m(module) WHERE u.id = (SELECT id FROM users WHERE email = 'admin@ims.com');

-- Sales permissions
INSERT INTO user_permissions (user_id, module, permission) VALUES
((SELECT id FROM users WHERE email = 'sales@ims.com'), 'products', 'read'),
((SELECT id FROM users WHERE email = 'sales@ims.com'), 'orders', 'full'),
((SELECT id FROM users WHERE email = 'sales@ims.com'), 'inventory', 'read'),
((SELECT id FROM users WHERE email = 'sales@ims.com'), 'reports', 'read'),
((SELECT id FROM users WHERE email = 'sales@ims.com'), 'suppliers', 'none'),
((SELECT id FROM users WHERE email = 'sales@ims.com'), 'warehouses', 'none'),
((SELECT id FROM users WHERE email = 'sales@ims.com'), 'users', 'none');

-- Warehouse permissions
INSERT INTO user_permissions (user_id, module, permission) VALUES
((SELECT id FROM users WHERE email = 'warehouse@ims.com'), 'products', 'read'),
((SELECT id FROM users WHERE email = 'warehouse@ims.com'), 'inventory', 'full'),
((SELECT id FROM users WHERE email = 'warehouse@ims.com'), 'warehouses', 'read'),
((SELECT id FROM users WHERE email = 'warehouse@ims.com'), 'orders', 'read'),
((SELECT id FROM users WHERE email = 'warehouse@ims.com'), 'reports', 'read'),
((SELECT id FROM users WHERE email = 'warehouse@ims.com'), 'suppliers', 'none'),
((SELECT id FROM users WHERE email = 'warehouse@ims.com'), 'users', 'none');

-- Supply permissions
INSERT INTO user_permissions (user_id, module, permission) VALUES
((SELECT id FROM users WHERE email = 'supply@ims.com'), 'products', 'create'),
((SELECT id FROM users WHERE email = 'supply@ims.com'), 'suppliers', 'full'),
((SELECT id FROM users WHERE email = 'supply@ims.com'), 'inventory', 'read'),
((SELECT id FROM users WHERE email = 'supply@ims.com'), 'orders', 'read'),
((SELECT id FROM users WHERE email = 'supply@ims.com'), 'reports', 'read'),
((SELECT id FROM users WHERE email = 'supply@ims.com'), 'warehouses', 'none'),
((SELECT id FROM users WHERE email = 'supply@ims.com'), 'users', 'none');

INSERT INTO warehouses (name, location, capacity) VALUES
('Main Warehouse', '123 Main St, City', 10000),
('North Warehouse', '456 North Ave, City', 5000);

INSERT INTO categories (name, parent_id) VALUES
('Electronics', NULL),
('Phones', 1),
('Laptops', 1),
('Accessories', 1);

INSERT INTO suppliers (name, contact_person, phone, email) VALUES
('Samsung Electronics', 'John Kim', '555-0100', 'orders@samsung.com'),
('Apple Inc', 'Jane Smith', '555-0101', 'procurement@apple.com'),
('Dell Technologies', 'Bob Johnson', '555-0102', 'supply@dell.com');

INSERT INTO products (name, sku, price, cost, category_id, supplier_id, brand) VALUES
('Galaxy S23', 'SAM-GS23', 999.99, 750.00, 2, 1, 'Samsung'),
('iPhone 15', 'APP-IP15', 1099.99, 800.00, 2, 2, 'Apple'),
('MacBook Pro 14', 'APP-MBP14', 1999.99, 1500.00, 3, 2, 'Apple'),
('XPS 15', 'DEL-XPS15', 1899.99, 1400.00, 3, 3, 'Dell'),
('Galaxy Buds', 'SAM-BUDS', 149.99, 100.00, 4, 1, 'Samsung');

INSERT INTO inventory (product_id, warehouse_id, quantity, reorder_point, max_stock) VALUES
(1, 1, 50, 10, 200),
(2, 1, 30, 10, 150),
(3, 1, 15, 5, 100),
(4, 2, 25, 8, 120),
(5, 1, 100, 20, 300);

INSERT INTO product_locations (product_id, warehouse_id, aisle_number, side, shelf_number, layer, quantity) VALUES
(1, 1, 1, 'left', 1, 'top', 25),
(1, 1, 1, 'left', 2, 'middle', 25),
(2, 1, 2, 'right', 1, 'top', 30),
(3, 1, 3, 'left', 1, 'middle', 15),
(4, 2, 1, 'left', 1, 'bottom', 25),
(5, 1, 1, 'right', 3, 'top', 100);