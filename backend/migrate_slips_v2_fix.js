const db = require('./db');

async function migrate() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Adding payroll_period_id...');
        await client.query(`ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS payroll_period_id UUID REFERENCES payroll_periods(id);`);

        console.log('Adding calculation columns...');
        await client.query(`ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS basic_salary_snapshot DECIMAL(12,2);`);
        await client.query(`ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS payable_days INT;`);
        await client.query(`ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS calculated_basic_salary DECIMAL(12,2);`);
        await client.query(`ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS total_allowances DECIMAL(12,2);`);
        await client.query(`ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS total_deductions DECIMAL(12,2);`);

        await client.query('COMMIT');
        console.log('Migration successful');
        process.exit();
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
    }
}

migrate();
