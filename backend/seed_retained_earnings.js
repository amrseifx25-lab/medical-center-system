require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

async function run() {
    try {
        await client.connect();
        // Check if exists first
        const check = await client.query("SELECT * FROM accounts WHERE name = 'Retained Earnings'");
        if (check.rows.length === 0) {
            console.log("Creating Retained Earnings account...");
            await client.query("INSERT INTO accounts (code, name, type) VALUES ('303', 'Retained Earnings', 'Equity')");
            console.log("Created.");
        } else {
            console.log("Already exists.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
