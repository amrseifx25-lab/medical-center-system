const dotenv = require('dotenv');
dotenv.config({ path: './backend/.env' });
const { pool } = require('./db');

const migrate = async () => {
    try {
        console.log('Starting Payroll V2 Migration...');

        // 1. Departments table already exists (Integer ID)
        console.log('Departments table exists (Integer ID).');

        // 1.1 Add department_id to employees
        await pool.query(`
            ALTER TABLE employees 
            ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id);
        `);
        console.log('Updated employees table with department_id.');

        // 2. Create payroll_codes table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payroll_codes (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(20) CHECK (type IN ('Earning', 'Deduction')) NOT NULL,
                calculation_method VARCHAR(20) CHECK (calculation_method IN ('Amount', 'Days', 'Hours')) NOT NULL,
                gl_account_id INTEGER REFERENCES accounts(id),
                department_id INTEGER REFERENCES departments(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created payroll_codes table.');

        // 3. Update employee_attendance
        // Check if columns exist first to avoid errors on re-run
        await pool.query(`
            ALTER TABLE employee_attendance 
            ADD COLUMN IF NOT EXISTS days_work_on_off INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS days_work_on_holiday INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS action_work_on_off VARCHAR(20) DEFAULT 'Pay'; -- 'Pay' or 'Credit'
        `);
        console.log('Updated employee_attendance table.');

        // 4. Update salary_slips
        await pool.query(`
            ALTER TABLE salary_slips
            ADD COLUMN IF NOT EXISTS earnings_details JSONB DEFAULT '[]',
            ADD COLUMN IF NOT EXISTS deductions_details JSONB DEFAULT '[]',
            ADD COLUMN IF NOT EXISTS cash_paid NUMERIC(12, 2) DEFAULT 0;
        `);
        console.log('Updated salary_slips table.');


        // 5. Additional Updates (Time Off Balance & Journal Dept)
        await pool.query(`
            ALTER TABLE employees 
            ADD COLUMN IF NOT EXISTS time_off_balance DECIMAL(10,2) DEFAULT 0;
        `);
        console.log('Updated employees with time_off_balance.');

        await pool.query(`
            ALTER TABLE journal_lines 
            ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id);
        `);
        console.log('Updated journal_lines with department_id.');

        console.log('Payroll V2 Migration Complete.');
        process.exit(0);
    } catch (err) {
        console.error('Migration Failed:', err);
        process.exit(1);
    }
};

migrate();
