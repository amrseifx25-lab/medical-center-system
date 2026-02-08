
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const checkSchema = async () => {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'lab_requests';
        `);
        console.log('Columns in lab_requests:', res.rows.map(r => r.column_name).join(', '));
    } catch (err) {
        console.error('Error checking schema:', err);
    } finally {
        pool.end();
    }
};

checkSchema();
