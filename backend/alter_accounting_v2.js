
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

        console.log('1. Adding is_locked to daily_closings...');
        // Check if column exists
        const checkLocked = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_closings' AND column_name = 'is_locked'");
        if (checkLocked.rows.length === 0) {
            await client.query('ALTER TABLE daily_closings ADD COLUMN is_locked BOOLEAN DEFAULT FALSE');
            console.log('   Column added.');
        } else {
            console.log('   Column already exists.');
        }

        console.log('2. Adding department to expenses...');
        const checkDept = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'department'");
        if (checkDept.rows.length === 0) {
            await client.query('ALTER TABLE expenses ADD COLUMN department VARCHAR(100) DEFAULT \'General\'');
            console.log('   Column added.');
        } else {
            console.log('   Column already exists.');
        }

        // 3. Rename closing_date to date if needed to match code (or update code)
        // My code uses 'date' but table has 'closing_date'. Let's check which one I used in the controller.
        // In createExpense I used 'date' for expenses table.
        // In checkLock I used 'date' for daily_closings.
        // The table has 'closing_date'. I better rename it to 'date' for consistency or update code.
        // Let's rename column for simplicity in code.
        const checkDateCol = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_closings' AND column_name = 'closing_date'");
        if (checkDateCol.rows.length > 0) {
            await client.query('ALTER TABLE daily_closings RENAME COLUMN closing_date TO date');
            console.log('   Renamed closing_date to date.');
        }

        await client.query('COMMIT');
        console.log('Migration Complete.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration Failed:', err);
    } finally {
        client.release();
        pool.end();
    }
};

migrate();
