const db = require('./db');

async function check() {
    try {
        const empCols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'employees'`);
        const slipCols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'salary_slips'`);

        console.log('Employees:', empCols.rows.map(r => r.column_name));
        console.log('Slips:', slipCols.rows.map(r => r.column_name));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
