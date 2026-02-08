const db = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        // 1. Seed Roles
        const roles = [
            'Admin', 'Doctor', 'Accountant', 'Receptionist', 'HR', 'Lab', 'Radiology'
        ];

        for (const role of roles) {
            const check = await db.query('SELECT id FROM roles WHERE name = $1', [role]);
            if (check.rows.length === 0) {
                await db.query('INSERT INTO roles (name) VALUES ($1)', [role]);
                console.log(`Role created: ${role}`);
            }
        }
        console.log('Roles seeded.');

        // 2. Get Admin Role ID
        const roleRes = await db.query("SELECT id FROM roles WHERE name = 'Admin'");
        const adminRoleId = roleRes.rows[0].id;

        // 3. Seed Admin User
        const userCheck = await db.query("SELECT id FROM users WHERE username = 'admin'");
        if (userCheck.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await db.query(`
                INSERT INTO users (username, password_hash, full_name, role_id)
                VALUES ('admin', $1, 'System Administrator', $2)
            `, [hashedPassword, adminRoleId]);
            console.log('Default Admin user seeded (admin / admin123).');
        } else {
            console.log('Admin user already exists.');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
