const { pool } = require('./db');

async function migrate() {
    try {
        await pool.query(`
            ALTER TABLE invoices 
            ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
        `);
        console.log('Successfully added cancellation_reason column to invoices table.');
    } catch (err) {
        console.error('Error executing migration:', err);
    } finally {
        // We need to close the pool to exit the script
        // Note: pool.end() might not be exposed depending on db.js, let's check or just let it hang/exit
        process.exit();
    }
}

migrate();
