
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
    try {
        console.log('Adding due_date and is_paid to expenses...');
        await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS due_date DATE;`);
        await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT TRUE;`); // Default true for existing cash expenses
        console.log('Done.');
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
};

migrate();
