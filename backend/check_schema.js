const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

const checkSchema = async () => {
    try {
        console.log('DB Config:', {
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: '***',
            port: process.env.DB_PORT
        });

        const expensesRes = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'expenses'
        `);
        console.log('Expenses Table Columns:', expensesRes.rows.map(r => `${r.column_name}`));

        const accountsRes = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'accounts'
        `);
        console.log('Accounts Table Columns:', accountsRes.rows.map(r => `${r.column_name}`));

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkSchema();
