
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
        console.log('--- Accounts Table ---');
        const acc = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'accounts'");
        console.log(acc.rows.map(r => `${r.column_name} (${r.data_type})`).join('\n'));

        console.log('\n--- Journal Entries Table ---');
        const je = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'journal_entries'");
        console.log(je.rows.map(r => `${r.column_name} (${r.data_type})`).join('\n'));

        console.log('\n--- Journal Lines Table ---');
        const jl = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'journal_lines'");
        console.log(jl.rows.map(r => `${r.column_name} (${r.data_type})`).join('\n'));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
};

checkSchema();
