
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const migrate = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('1. Creating Expenses Table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL DEFAULT CURRENT_DATE,
                vendor VARCHAR(255),
                category VARCHAR(100) NOT NULL,
                description TEXT,
                amount DECIMAL(15, 2) NOT NULL,
                payment_method VARCHAR(50) DEFAULT 'Cash',
                attachment_url TEXT,
                created_by UUID,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('2. Creating Daily Closings Table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS daily_closings (
                id SERIAL PRIMARY KEY,
                date DATE UNIQUE NOT NULL,
                closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_revenue DECIMAL(15, 2) DEFAULT 0,
                total_expenses DECIMAL(15, 2) DEFAULT 0,
                cash_collected DECIMAL(15, 2) DEFAULT 0,
                closing_balance DECIMAL(15, 2) DEFAULT 0,
                is_locked BOOLEAN DEFAULT TRUE,
                closed_by UUID
            );
        `);

        console.log('3. Seeding Chart of Accounts...');
        // Clear existing accounts to start fresh or use UPSERT if preserving IDs is needed. 
        // For this overhaul, we'll truncate and re-seed to match the exact specs.
        // WARNING: This deletes existing accounts. In production, we'd be more careful.
        await client.query('TRUNCATE TABLE accounts CASCADE'); // Ensure we start with clean IDs for the tree

        const accounts = [
            // Assets (1)
            { code: '1', name: 'Al-Osoul (Assets)', type: 'asset', parent: null },
            { code: '101', name: 'Cash', type: 'asset', parent: '1' },
            { code: '102', name: 'Bank', type: 'asset', parent: '1' },
            { code: '103', name: 'Owner Receivable', type: 'asset', parent: '1' },
            { code: '104', name: 'Employee Receivable', type: 'asset', parent: '1' },

            // Liabilities (2)
            { code: '2', name: 'Al-Khosoum (Liabilities)', type: 'liability', parent: null },
            { code: '201', name: 'VAT Payable', type: 'liability', parent: '2' },
            { code: '202', name: 'Accounts Payable', type: 'liability', parent: '2' },

            // Equity (3)
            { code: '3', name: 'Hoqooq Al-Molak (Equity)', type: 'equity', parent: null },
            { code: '301', name: 'Capital', type: 'equity', parent: '3' },

            // Revenue (4)
            { code: '4', name: 'Al-Iradat (Revenue)', type: 'revenue', parent: null },
            { code: '401', name: 'Medical Services Revenue', type: 'revenue', parent: '4' },

            // Expenses (5)
            { code: '5', name: 'Al-Masrofat (Expenses)', type: 'expense', parent: null },
            { code: '501', name: 'Rent Expense', type: 'expense', parent: '5' },
            { code: '502', name: 'Utilities Expense', type: 'expense', parent: '5' },
            { code: '503', name: 'Salaries Expense', type: 'expense', parent: '5' },
            { code: '504', name: 'Supplies Expense', type: 'expense', parent: '5' },
            { code: '505', name: 'Maintenance Expense', type: 'expense', parent: '5' },
            { code: '506', name: 'Other Expenses', type: 'expense', parent: '5' },

            // Contra/Other
            { code: '6', name: 'Other (Contra)', type: 'other', parent: null },
            { code: '601', name: 'Discounts Given', type: 'expense', parent: '6' } // Treated as expense or contra-revenue
        ];

        // Insert Parent (Level 1)
        for (const acc of accounts.filter(a => !a.parent)) {
            const res = await client.query(
                'INSERT INTO accounts (code, name, type, parent_id) VALUES ($1, $2, $3, NULL) RETURNING id, code',
                [acc.code, acc.name, acc.type]
            );
            acc.id = res.rows[0].id; // Save ID for children
        }

        // Insert Children (Level 2)
        // We need to look up parent IDs. Since we just inserted them, we can map code -> id if we query back, 
        // or just rely on the memory array if we process sequentially carefully.
        // Better approach: Fetch all parents first.
        const parentRows = await client.query('SELECT id, code FROM accounts WHERE parent_id IS NULL');
        const parentMap = {};
        parentRows.rows.forEach(r => parentMap[r.code] = r.id);

        for (const acc of accounts.filter(a => a.parent)) {
            const parentId = parentMap[acc.parent];
            if (parentId) {
                await client.query(
                    'INSERT INTO accounts (code, name, type, parent_id) VALUES ($1, $2, $3, $4)',
                    [acc.code, acc.name, acc.type, parentId]
                );
            }
        }

        await client.query('COMMIT');
        console.log('Migration Complete.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration Failed:', err);
    } finally {
        client.release();
        pool.end();
    }
};

migrate();
