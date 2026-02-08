const db = require('./db');

async function checkSchema() {
    try {
        const res = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'salary_slips';
        `);
        console.log('Columns in salary_slips:', res.rows.map(r => r.column_name));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
