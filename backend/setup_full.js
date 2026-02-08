const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config(); // Load .env explicitly for this script

const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
};

const setup = async () => {
    console.log('🚀 Starting System Setup...');

    try {
        // --- 0. Create Database if not exists ---
        console.log(`🔨 Checking Database '${dbConfig.database}'...`);
        const rootPool = new Pool({
            ...dbConfig,
            database: 'postgres' // Connect to default DB
        });

        try {
            const res = await rootPool.query(`SELECT 1 FROM pg_database WHERE datname = '${dbConfig.database}'`);
            if (res.rows.length === 0) {
                console.log(`   Creating database '${dbConfig.database}'...`);
                await rootPool.query(`CREATE DATABASE "${dbConfig.database}"`);
                console.log('   ✅ Database created.');
            } else {
                console.log('   ✅ Database already exists.');
            }
        } catch (err) {
            console.error('   ⚠️ Error checking/creating database:', err.message);
        } finally {
            await rootPool.end();
        }

        // --- Connect to Target Database ---
        const db = new Pool(dbConfig);

        // --- 1. Run Schema (Create Tables) ---
        console.log('📦 Applying Schema...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split by semicolon to run statements individually (better error handling)
        const statements = schemaSql.split(';').map(s => s.trim()).filter(s => s.length > 0);

        for (const statement of statements) {
            try {
                await db.query(statement);
            } catch (err) {
                // Ignore "relation already exists" or "type already exists" errors
                if (err.code !== '42P07' && err.code !== '42710') {
                    console.log(`   ⚠️ Notice: ${err.message.split('\n')[0]}`);
                }
            }
        }
        console.log('✅ Schema Applied.');

        // --- 2. Seed Data ---
        console.log('🌱 Seeding Data...');

        // 2.1 Accounts
        const accounts = [
            { code: '101', name: 'Cash', type: 'asset' },
            { code: '102', name: 'Bank Al-Ahly', type: 'asset' },
            { code: '201', name: 'Accounts Payable', type: 'liability' },
            { code: '301', name: 'Capital', type: 'equity' },
            { code: '401', name: 'Service Revenue', type: 'revenue' },
            { code: '501', name: 'Salaries Expense', type: 'expense' },
            { code: '502', name: 'Medical Supplies', type: 'expense' }
        ];

        for (const acc of accounts) {
            const check = await db.query('SELECT id FROM accounts WHERE code = $1', [acc.code]);
            if (check.rows.length === 0) {
                await db.query('INSERT INTO accounts (code, name, type) VALUES ($1, $2, $3)', [acc.code, acc.name, acc.type]);
            }
        }

        // 2.2 Patients
        const patientsData = [
            { full_name: 'Ahmed Mohamed', national_id: '29001011234567', phone: '01012345678', gender: 'male', dob: '1990-01-01', address: 'Cairo' },
            { full_name: 'Sara Ali', national_id: '29505051234567', phone: '01123456789', gender: 'female', dob: '1995-05-05', address: 'Giza' },
            { full_name: 'Mohamed Hassan', national_id: '28010101234567', phone: '01234567890', gender: 'male', dob: '1980-10-10', address: 'Alexandria' }
        ];

        let patientIds = [];
        for (const p of patientsData) {
            // Check if patient exists to avoid unique constraint error
            const check = await db.query('SELECT id FROM patients WHERE national_id = $1', [p.national_id]);
            if (check.rows.length > 0) {
                patientIds.push(check.rows[0].id);
            } else {
                const res = await db.query(
                    `INSERT INTO patients (full_name, national_id, phone, gender, dob, address) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                    [p.full_name, p.national_id, p.phone, p.gender, p.dob, p.address]
                );
                patientIds.push(res.rows[0].id);
            }
        }

        // 2.3 Employees (Fixing Column Names)
        const employeesData = [
            { full_name: 'Dr. Youssef', position: 'Radiologist', salary: 15000 },
            { full_name: 'Dr. Mona', position: 'Lab Specialist', salary: 12000 },
            { full_name: 'Nurse Hoda', position: 'Nurse', salary: 6000 }
        ];

        for (const e of employeesData) {
            const res = await db.query(
                `INSERT INTO employees (full_name, position, join_date, basic_salary, insurance_salary) 
                 VALUES ($1, $2, '2024-01-01', $3, $3 * 0.8)`,
                [e.full_name, e.position, e.salary]
            );
        }

        // 2.4 Visits & Requests
        // Only insert if no visits exist to avoid duplicates on re-run
        const visitCheck = await db.query('SELECT count(*) FROM visits');
        if (parseInt(visitCheck.rows[0].count) === 0) {
            // Radiology Visit
            const v1 = await db.query('INSERT INTO visits (patient_id, type, status) VALUES ($1, $2, $3) RETURNING id', [patientIds[0], 'radiology', 'pending']);
            await db.query('INSERT INTO radiology_requests (visit_id, service_type, status) VALUES ($1, $2, $3)', [v1.rows[0].id, 'MRI Brain', 'pending']);

            // Lab Visit
            const v2 = await db.query('INSERT INTO visits (patient_id, type, status) VALUES ($1, $2, $3) RETURNING id', [patientIds[1], 'lab', 'pending']);
            await db.query('INSERT INTO lab_requests (visit_id, test_type) VALUES ($1, $2)', [v2.rows[0].id, 'CBC']);
        }

        console.log('✅ System Setup & Seeding Complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Setup Failed:', err);
        process.exit(1);
    }
};

setup();
