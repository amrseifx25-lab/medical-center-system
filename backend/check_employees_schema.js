const dotenv = require('dotenv');
dotenv.config({ path: './backend/.env' });
const { pool } = require('./db');

const checkSchema = async () => {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employees'");
        console.log('Employees Table Schema:', res.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
};

checkSchema();
