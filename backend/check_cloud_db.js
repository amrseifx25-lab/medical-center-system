const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('❌ DATABASE_URL is missing. Please set it.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        console.log('🔍 Checking Cloud Database...');

        const rolesRes = await pool.query('SELECT name FROM roles');
        console.log('Roles found:', rolesRes.rows.map(r => r.name).join(', '));

        const usersRes = await pool.query('SELECT username, full_name, role_id FROM users');
        console.log('Users found:', usersRes.rows.length);
        usersRes.rows.forEach(u => {
            console.log(` - User: ${u.username} (${u.full_name}), Role ID: ${u.role_id}`);
        });

        if (usersRes.rows.length === 0) {
            console.warn('⚠️ NO USERS FOUND! Seeding might have failed.');
        } else {
            console.log('✅ Users are present in the database.');
        }

    } catch (err) {
        console.error('❌ Connection Failed:', err.message);
    } finally {
        await pool.end();
    }
}

check();
