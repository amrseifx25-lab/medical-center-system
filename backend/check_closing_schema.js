
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const check = async () => {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_closings'");
        console.log('Columns in daily_closings:', res.rows.map(r => r.column_name));
    } catch (e) { console.error(e); }
    finally { pool.end(); }
};
check();
