const db = require('./db');

async function check() {
    try {
        const res = await db.query(`SELECT to_regclass('roles');`);
        console.log('Roles Table Exists:', res.rows[0].to_regclass);
        if (res.rows[0].to_regclass) {
            const cols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'roles'`);
            console.log('Columns:', cols.rows.map(r => r.column_name));
            const roles = await db.query('SELECT * FROM roles');
            console.log('Roles Data:', roles.rows);
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
