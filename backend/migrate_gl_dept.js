
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
        console.log('Adding department to journal_lines...');
        await pool.query(`ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS department VARCHAR(100);`);
        console.log('Done.');
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
};

migrate();
