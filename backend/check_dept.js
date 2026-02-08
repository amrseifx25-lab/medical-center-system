const db = require('./db');

async function check() {
    try {
        const res = await db.query(`SELECT to_regclass('departments');`);
        console.log('Exists:', res.rows[0].to_regclass);
        if (res.rows[0].to_regclass) {
            const cols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'departments'`);
            console.log('Columns:', cols.rows.map(r => r.column_name));
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
