
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
        await pool.query('ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS result_text TEXT');
        console.log('Added result_text column to lab_requests');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
};

migrate();
