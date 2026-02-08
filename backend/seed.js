const db = require('./db');

const seed = async () => {
    console.log('🌱 Seeding Data...');

    try {
        // --- 1. Cleanup (Optional, be careful in prod!) ---
        // await db.query('TRUNCATE users, patients, doctors, visits, radiology_requests, lab_requests, employees, accounts RESTART IDENTITY CASCADE');

        // --- 2. Accounts (Chart of Accounts) ---
        console.log('Creating Chart of Accounts...');
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
            // Check if exists
            const check = await db.query('SELECT id FROM accounts WHERE code = $1', [acc.code]);
            if (check.rows.length === 0) {
                await db.query('INSERT INTO accounts (code, name, type) VALUES ($1, $2, $3)', [acc.code, acc.name, acc.type]);
            }
        }

        // --- 3. Patients ---
        console.log('Creating Patients...');
        const patientsData = [
            { full_name: 'Ahmed Mohamed', national_id: '29001011234567', phone: '01012345678', gender: 'male', dob: '1990-01-01', address: 'Cairo' },
            { full_name: 'Sara Ali', national_id: '29505051234567', phone: '01123456789', gender: 'female', dob: '1995-05-05', address: 'Giza' },
            { full_name: 'Mohamed Hassan', national_id: '28010101234567', phone: '01234567890', gender: 'male', dob: '1980-10-10', address: 'Alexandria' }
        ];

        let patientIds = [];
        for (const p of patientsData) {
            const res = await db.query(
                `INSERT INTO patients (full_name, national_id, phone, gender, dob, address) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 ON CONFLICT (national_id) DO UPDATE SET full_name = EXCLUDED.full_name 
                 RETURNING id`,
                [p.full_name, p.national_id, p.phone, p.gender, p.dob, p.address]
            );
            patientIds.push(res.rows[0].id);
        }

        // --- 4. Employees / Doctors ---
        console.log('Creating Employees...');
        const employeesData = [
            { name: 'Dr. Youssef (Radiologist)', position: 'Radiologist', salary: 15000 },
            { name: 'Dr. Mona (Lab Specialist)', position: 'Lab Specialist', salary: 12000 },
            { name: 'Nurse Hoda', position: 'Nurse', salary: 6000 }
        ];

        let empIds = [];
        for (const e of employeesData) {
            const res = await db.query(
                `INSERT INTO employees (name, position, department, basic_salary, insurance_salary, hire_date) 
                 VALUES ($1, $2, 'Medical', $3, $3 * 0.8, '2024-01-01') RETURNING id`,
                [e.name, e.position, e.salary]
            );
            empIds.push(res.rows[0].id);
        }

        // --- 5. Visits & Requests ---
        console.log('Creating Visits & Requests...');

        // Visit 1: Radiology for Patient 1
        const v1 = await db.query('INSERT INTO visits (patient_id, type, status) VALUES ($1, $2, $3) RETURNING id', [patientIds[0], 'radiology', 'pending']);
        await db.query('INSERT INTO radiology_requests (visit_id, service_type, status) VALUES ($1, $2, $3)', [v1.rows[0].id, 'MRI Brain', 'pending']);

        // Visit 2: Lab for Patient 2
        const v2 = await db.query('INSERT INTO visits (patient_id, type, status) VALUES ($1, $2, $3) RETURNING id', [patientIds[1], 'lab', 'pending']);
        await db.query('INSERT INTO lab_requests (visit_id, test_type) VALUES ($1, $2)', [v2.rows[0].id, 'CBC']);

        // Visit 3: Lab for Patient 1 (Completed)
        const v3 = await db.query('INSERT INTO visits (patient_id, type, status) VALUES ($1, $2, $3) RETURNING id', [patientIds[0], 'lab', 'completed']);
        const lr3 = await db.query('INSERT INTO lab_requests (visit_id, test_type) VALUES ($1, $2) RETURNING id', [v3.rows[0].id, 'Lipid Profile']);
        await db.query('INSERT INTO lab_results (request_id, parameter_name, value, unit, reference_range) VALUES ($1, $2, $3, $4, $5)', [lr3.rows[0].id, 'Cholesterol', '220', 'mg/dL', '< 200']);

        console.log('✅ Seeding Complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding Failed:', err);
        process.exit(1);
    }
};

seed();
