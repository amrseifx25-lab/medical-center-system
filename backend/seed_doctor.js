const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: 'postgresql://postgres:root@localhost:5432/medical_center'
});

async function run() {
    try {
        const hashedPassword = await bcrypt.hash('doctor123', 10);
        await pool.query(
            "INSERT INTO users (username, password_hash, full_name, role_id) VALUES ('doctor', $1, 'Dr. Ahmed Clinic', 2) ON CONFLICT (username) DO NOTHING",
            [hashedPassword]
        );
        console.log('Doctor user created: doctor / doctor123');
    } catch (err) {
        console.error('Error seeding doctor:', err);
    } finally {
        await pool.end();
    }
}

run();
