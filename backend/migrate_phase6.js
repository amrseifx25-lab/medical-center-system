
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const migrate = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create Departments Table
        console.log('Creating departments table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS departments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Create Expense Categories Table
        console.log('Creating expense_categories table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS expense_categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Seed Initial Data (if empty)
        const depts = ['General', 'Marketing', 'HR', 'Laboratory', 'Radiology', 'Admin'];
        for (const d of depts) {
            await client.query(`INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [d]);
        }

        const cats = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Maintenance', 'Other'];
        for (const c of cats) {
            await client.query(`INSERT INTO expense_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [c]);
        }

        // 4. Update Journal Entries Table
        console.log('Updating journal_entries table...');
        const checkRev = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'revision_reason'");
        if (checkRev.rows.length === 0) {
            await client.query('ALTER TABLE journal_entries ADD COLUMN revision_reason TEXT');
            await client.query('ALTER TABLE journal_entries ADD COLUMN last_revised_at TIMESTAMP');
            console.log('   Revision columns added.');
        }

        await client.query('COMMIT');
        console.log('Phase 6 Migration Complete.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration Failed:', err);
    } finally {
        client.release();
        pool.end();
    }
};

migrate();
