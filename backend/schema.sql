-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Core / Auth
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- admin, doctor, accountant, receptionist, hr
    permissions JSONB DEFAULT '{}'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Patients (EMR)
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    national_id VARCHAR(14) UNIQUE,
    phone VARCHAR(20),
    gender VARCHAR(10),
    dob DATE,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES users(id),
    visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(50) NOT NULL, -- radiology, lab, checkup
    status VARCHAR(20) DEFAULT 'pending' -- pending, in-progress, completed, cancelled
);

-- 3. Radiology (RIS)
CREATE TABLE radiology_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id),
    service_type VARCHAR(100) NOT NULL, -- e.g., X-Ray Chest, MRI Brain
    status VARCHAR(20) DEFAULT 'pending', -- pending, done, reported
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE radiology_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES radiology_requests(id),
    content TEXT, -- HTML or Markdown content
    images JSONB, -- Array of image URLs/paths
    finalized_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Lab (LIS)
CREATE TABLE lab_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id),
    test_type VARCHAR(100) NOT NULL -- e.g., CBC, Lipid Profile
);

CREATE TABLE lab_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES lab_requests(id),
    parameter_name VARCHAR(100) NOT NULL, -- e.g., Hemoglobin
    value VARCHAR(50) NOT NULL,
    unit VARCHAR(20),
    reference_range VARCHAR(50),
    is_abnormal BOOLEAN DEFAULT FALSE
);

-- 5. Accounting
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- asset, liability, equity, income, expense
    parent_id INTEGER REFERENCES accounts(id)
);

CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    description TEXT,
    reference_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE TABLE journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id UUID REFERENCES journal_entries(id),
    account_id INTEGER REFERENCES accounts(id),
    debit DECIMAL(15, 2) DEFAULT 0,
    credit DECIMAL(15, 2) DEFAULT 0
);

-- 6. HR & Payroll (Egyptian Law)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    position VARCHAR(100),
    join_date DATE NOT NULL,
    basic_salary DECIMAL(10, 2) NOT NULL, -- As per contract
    variable_salary DECIMAL(10, 2) DEFAULT 0, -- Allowances, etc.
    insurance_salary DECIMAL(10, 2) NOT NULL -- For social insurance calc
);

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    overtime_hours DECIMAL(4, 2) DEFAULT 0,
    lateness_minutes INTEGER DEFAULT 0,
    status VARCHAR(20) -- present, absent, leave, holiday
);

CREATE TABLE payroll_settings (
    id SERIAL PRIMARY KEY,
    year INTEGER UNIQUE NOT NULL,
    min_insurance_limit DECIMAL(10, 2) NOT NULL,
    max_insurance_limit DECIMAL(10, 2) NOT NULL,
    tax_brackets JSONB NOT NULL -- Stores tax rules for the year
);

CREATE TABLE salary_slips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    gross_salary DECIMAL(10, 2) NOT NULL,
    
    -- Deductions
    insurance_employee_share DECIMAL(10, 2) NOT NULL,
    income_tax DECIMAL(10, 2) NOT NULL,
    penalties DECIMAL(10, 2) DEFAULT 0,
    
    -- Additions
    overtime_payment DECIMAL(10, 2) DEFAULT 0,
    bonuses DECIMAL(10, 2) DEFAULT 0,
    
    net_salary DECIMAL(10, 2) NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
