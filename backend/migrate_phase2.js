const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'medical_center',
    password: process.env.DB_PASSWORD || 'password', // Will be overridden by environment
    port: process.env.DB_PORT || 5432,
});

async function migratePhase2() {
    try {
        console.log('🔌 Connecting to database...');
        const client = await pool.connect();

        console.log('📄 Reading Phase 2 Schema...');
        const schemaPath = path.join(__dirname, 'schema_phase2.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('🚀 Executing Migration...');
        await client.query(schemaSql);

        console.log('✅ Phase 2 Migration Complete! New tables created.');

        // Optional: Seed some initial services
        const servicesCount = await client.query('SELECT count(*) FROM services');
        if (parseInt(servicesCount.rows[0].count) === 0) {
            console.log('🌱 Seeding initial services directly...');
            const seedSql = `
                INSERT INTO services (name, price, category) VALUES
                ('كشف باطنة', 200.00, 'Consultation'),
                ('كشف عظام', 250.00, 'Consultation'),
                ('صورة دم كاملة CBC', 150.00, 'Lab'),
                ('أشعة سينية للصدر', 300.00, 'Radiology'),
                ('رسم قلب', 100.00, 'Procedure');
            `;
            await client.query(seedSql);
            console.log('✅ Initial services seeded.');
        }

        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    }
}

migratePhase2();
