-- =====================================================
-- SALES MANAGER PANEL - DATABASE SCHEMA ADDITIONS
-- =====================================================

-- Add sales_manager role to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_manager';

-- =====================================================
-- 1. supplier_messages (communication with suppliers)
-- =====================================================
CREATE TABLE IF NOT EXISTS supplier_messages (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    sender_id INTEGER NOT NULL REFERENCES users(id),
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('inquiry', 'quote_request', 'complaint', 'general', 'response')),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'read', 'replied', 'archived')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    replied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_messages_supplier ON supplier_messages(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_messages_sender ON supplier_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_supplier_messages_status ON supplier_messages(status);
CREATE INDEX IF NOT EXISTS idx_supplier_messages_created ON supplier_messages(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_supplier_messages_updated_at 
    BEFORE UPDATE ON supplier_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. product_discounts (active discounts on products)
-- =====================================================
CREATE TABLE IF NOT EXISTS product_discounts (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_type VARCHAR(10) NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    reason TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_product_discounts_product ON product_discounts(product_id);
CREATE INDEX IF NOT EXISTS idx_product_discounts_active ON product_discounts(is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_product_discounts_created_by ON product_discounts(created_by);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_product_discounts_updated_at 
    BEFORE UPDATE ON product_discounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA for testing
-- =====================================================
-- Add a sales manager user (if not exists)
INSERT INTO users (name, email, password_hash, role) 
VALUES ('Sales Manager', 'salesmanager@ims.com', 'salesmanager123', 'sales_manager')
ON CONFLICT (email) DO NOTHING;

-- Sample active discounts
INSERT INTO product_discounts (product_id, discount_percentage, discount_amount, discount_type, start_date, end_date, reason, created_by, is_active) VALUES
(1, 15.00, 0, 'percent', NOW(), NOW() + INTERVAL '30 days', 'Summer sale promotion', 2, TRUE),
(5, 0, 20.00, 'fixed', NOW(), NOW() + INTERVAL '14 days', 'Clearance sale', 2, TRUE)
ON CONFLICT DO NOTHING;

-- Sample supplier messages
INSERT INTO supplier_messages (supplier_id, sender_id, subject, message, message_type, status, priority) VALUES
(1, 5, 'Quote Request - Galaxy S23 Bulk Order', 'We would like to request a quote for 500 units of Galaxy S23. Please provide your best pricing for bulk orders.', 'quote_request', 'sent', 'high'),
(2, 5, 'Delivery Delay Inquiry', 'Our last order from Apple Inc seems to be delayed. Can you provide an update on the expected delivery date?', 'inquiry', 'sent', 'normal'),
(3, 5, 'New Product Availability', 'Are there any new Dell laptop models available for Q2 2026? We are interested in expanding our laptop inventory.', 'inquiry', 'sent', 'low')
ON CONFLICT DO NOTHING;