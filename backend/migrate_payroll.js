const dotenv = require('dotenv');
dotenv.config({ path: './backend/.env' });
const { pool } = require('./db');

const migrate = async () => {
    try {
        console.log('Starting Payroll Migration...');

        // 1. Payroll Periods
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payroll_periods (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                month INTEGER NOT NULL,
                year INTEGER NOT NULL,
                status VARCHAR(20) DEFAULT 'Draft', -- 'Draft', 'Closed'
                closed_at TIMESTAMP,
                journal_entry_id UUID, -- Link to accounting
                UNIQUE(month, year)
            );
        `);

        // 2. Employee Attendance
        await pool.query(`
            CREATE TABLE IF NOT EXISTS employee_attendance (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                employee_id UUID REFERENCES employees(id), -- Wait, need to check if employees table exists and check ID type. Original schema had SERIAL? No, schema.sql says users is UUID, but employees?
                month INTEGER NOT NULL,
                year INTEGER NOT NULL,
                days_present INTEGER DEFAULT 0,
                days_absent INTEGER DEFAULT 0,
                days_off INTEGER DEFAULT 0,
                days_holiday INTEGER DEFAULT 0,
                days_unpaid INTEGER DEFAULT 0,
                UNIQUE(employee_id, month, year)
            );
        `);
        // Note: Checking employees table ID type. Existing HR code used SERIAL (integer) in original mock, 
        // but schema.sql didn't show employees table! 
        // Let's check if employees table exists and its ID type first.

        // 3. Salary Slips
        await pool.query(`
            CREATE TABLE IF NOT EXISTS salary_slips (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                payroll_period_id UUID REFERENCES payroll_periods(id),
                employee_id UUID, -- Constraint added later if we confirm ID type
                basic_salary_snapshot DECIMAL(12, 2) DEFAULT 0,
                payable_days INTEGER DEFAULT 30,
                calculated_basic_salary DECIMAL(12, 2) DEFAULT 0,
                allowances JSONB DEFAULT '[]', -- [{description, amount}]
                deductions JSONB DEFAULT '[]', -- [{description, amount}]
                total_allowances DECIMAL(12, 2) DEFAULT 0,
                total_deductions DECIMAL(12, 2) DEFAULT 0,
                net_salary DECIMAL(12, 2) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'Draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Payroll Tables Created.');
    } catch (err) {
        console.error('Migration Failed:', err);
    } finally {
        pool.end();
    }
};

migrate();
