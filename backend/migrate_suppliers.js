
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
        const client = await pool.connect();
        try {
            console.log('Creating suppliers table...');
            await client.query(`
                CREATE TABLE IF NOT EXISTS suppliers (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    commercial_record VARCHAR(100),
                    address TEXT,
                    phone VARCHAR(50),
                    tax_number VARCHAR(50),
                    email VARCHAR(100),
                    nature_of_business TEXT,
                    account_id INTEGER REFERENCES accounts(id),
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);
            console.log('Table created.');

            // Ensure we have a root Accounts Payable account to attach suppliers to
            // Standard Code for AP often starts with 2 (Liabilities). Let's check or create 201.
            const apCheck = await client.query("SELECT * FROM accounts WHERE code = '201'");
            if (apCheck.rows.length === 0) {
                console.log('Creating Default Accounts Payable Parent Account (201)...');
                await client.query("INSERT INTO accounts (code, name, type) VALUES ('201', 'Suppliers Payable', 'Liability')");
            }

        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
};

migrate();
