
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
            console.log('Adding description column to journal_lines...');

            // Check if column exists
            const res = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='journal_lines' AND column_name='description'
            `);

            if (res.rows.length === 0) {
                await client.query(`ALTER TABLE journal_lines ADD COLUMN description TEXT`);
                console.log('Column description added to journal_lines.');
            } else {
                console.log('Column description already exists.');
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
