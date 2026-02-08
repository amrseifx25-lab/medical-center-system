const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable is missing.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
});

const runSqlFile = async (filePath) => {
    console.log(`📜 Running SQL file: ${path.basename(filePath)}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

    for (const statement of statements) {
        try {
            await pool.query(statement);
        } catch (err) {
            if (err.code !== '42P07' && err.code !== '42710') {
                console.warn(`   ⚠️ Warning: ${err.message.split('\n')[0]}`);
            }
        }
    }
    console.log(`✅ ${path.basename(filePath)} applied.`);
};

const setup = async () => {
    console.log('🚀 Starting Production Database Initialization...');
    try {
        // 1. Run Schema Files
        await runSqlFile(path.join(__dirname, 'schema.sql'));
        await runSqlFile(path.join(__dirname, 'schema_phase2.sql'));

        // 2. Apply migrations & Add missing tables
        console.log('🛠️ Applying additional migrations & Phase 3/4 tables...');

        // Create medical_reports if missing
        await pool.query(`
            CREATE TABLE IF NOT EXISTS medical_reports (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                invoice_id UUID REFERENCES invoices(id),
                patient_id UUID REFERENCES patients(id),
                doctor_id UUID REFERENCES users(id),
                complaint TEXT,
                diagnosis TEXT,
                treatment TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;`);
        await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id);`);
        await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES users(id);`);
        console.log('✅ Migrations & Extra tables applied.');

        // 3. Seed Roles
        console.log('🌱 Seeding Roles...');
        const roles = ['Admin', 'Doctor', 'Accountant', 'Receptionist', 'HR', 'Lab', 'Radiology'];
        for (const role of roles) {
            await pool.query('INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [role]);
        }
        console.log('✅ Roles seeded.');

        // 4. Seed Admin
        console.log('👤 Seeding Admin user...');
        const bcrypt = require('bcryptjs');
        const adminHashed = await bcrypt.hash('admin123', 10);
        const adminRoleRes = await pool.query("SELECT id FROM roles WHERE name = 'Admin'");
        const adminRoleId = adminRoleRes.rows[0].id;
        await pool.query(
            "INSERT INTO users (username, password_hash, full_name, role_id) VALUES ('admin', $1, 'System Administrator', $2) ON CONFLICT (username) DO NOTHING",
            [adminHashed, adminRoleId]
        );
        console.log('✅ Admin user created (admin / admin123).');

        // 5. Seed Doctor
        console.log('👤 Seeding Doctor user...');
        const doctorHashed = await bcrypt.hash('doctor123', 10);
        const doctorRoleRes = await pool.query("SELECT id FROM roles WHERE name = 'Doctor'");
        const doctorRoleId = doctorRoleRes.rows[0].id;
        await pool.query(
            "INSERT INTO users (username, password_hash, full_name, role_id) VALUES ('doctor', $1, 'Dr. Ahmed Clinic', $2) ON CONFLICT (username) DO NOTHING",
            [doctorHashed, doctorRoleId]
        );
        console.log('✅ Doctor user created (doctor / doctor123).');

        console.log('\n✨ DATABASE INITIALIZED SUCCESSFULLY! ✨');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Initialization Failed:', err);
        process.exit(1);
    }
};

setup();
