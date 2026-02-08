-- Phase 2: Financial Management Schema

-- 7. Services (Price List)
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    category VARCHAR(50), -- Consultation, Lab, Radiology, Procedure
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL, -- percentage, fixed
    value DECIMAL(10, 2) NOT NULL,
    usage_limit INTEGER DEFAULT 0, -- 0 = unlimited
    used_count INTEGER DEFAULT 0,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES users(id), -- Optional: referring doctor
    
    -- Financials
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Sum of items
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    final_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'unpaid', -- unpaid, paid, void
    payment_method VARCHAR(50), -- cash, card, insurance
    paid_at TIMESTAMP,
    
    -- Coupon Link
    coupon_id UUID REFERENCES coupons(id),
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id),
    
    -- Snapshot data (values at time of invoice)
    service_name VARCHAR(150) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    subtotal DECIMAL(12, 2) NOT NULL -- unit_price * quantity
);

-- 11. Daily Closings (Financial Lock)
CREATE TABLE IF NOT EXISTS daily_closings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    closing_date DATE UNIQUE NOT NULL,
    
    total_revenue DECIMAL(15, 2) DEFAULT 0,
    total_cash DECIMAL(15, 2) DEFAULT 0,
    total_card DECIMAL(15, 2) DEFAULT 0,
    total_insurance DECIMAL(15, 2) DEFAULT 0,
    
    total_invoices_count INTEGER DEFAULT 0,
    
    closed_by UUID REFERENCES users(id),
    closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
