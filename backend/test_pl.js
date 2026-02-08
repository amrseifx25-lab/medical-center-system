
const API_URL = 'http://localhost:5000/api';

const runTest = async () => {
    try {
        console.log('--- TEST START: ACCOUNTING + P&L ---');

        const post = async (url, body) => {
            const res = await fetch(API_URL + url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`POST ${url} failed: ${res.status} - ${txt}`);
            }
            return await res.json();
        };

        const put = async (url, body) => {
            const res = await fetch(API_URL + url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error(`PUT ${url} failed: ${res.status}`);
            return await res.json();
        };

        const get = async (url) => {
            const res = await fetch(API_URL + url);
            if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
            return await res.json();
        };

        // 1. Create Patient & Invoice (Revenue)
        console.log('1. Creating Patient & Invoice (Lab)...');
        // This will create revenue for Department 'Lab'
        const patient = await post('/patients', { full_name: 'P&L Test Patient', phone: '555', age: 40, gender: 'Male' });
        const service = await post('/services', { name: 'CBC Test', price: 300, category: 'Lab', is_active: true });

        const invoiceRes = await post('/invoices', {
            patient_id: patient.id,
            items: [{ service_id: service.id, service_name: service.name, unit_price: 300, quantity: 1 }]
        });
        const invoiceId = invoiceRes.invoice.id;

        // Settle (Create Journal Entry for Revenue)
        await put(`/invoices/${invoiceId}/settle`, { payment_method: 'Cash' });
        console.log('   Invoice Settled (Revenue 300 to Lab).');

        // 2. Create Expenses
        console.log('2. Creating Expenses...');
        // Expense 1: 100 for Lab Supplies
        await post('/accounting/expenses', {
            date: new Date().toISOString().split('T')[0],
            vendor: 'Lab Supply Co',
            department: 'Laboratory',
            category: 'Supplies',
            description: 'Reagents',
            amount: 100,
            payment_method: 'Cash'
        });

        // Expense 2: 50 for Admin
        await post('/accounting/expenses', {
            date: new Date().toISOString().split('T')[0],
            vendor: 'Office Depot',
            department: 'Admin',
            category: 'Supplies',
            description: 'Paper',
            amount: 50,
            payment_method: 'Cash'
        });

        // 3. Verify P&L
        console.log('3. Fetching Profit & Loss Report...');
        const pl = await get('/accounting/reports/profit-loss');
        console.log('   Report:', JSON.stringify(pl, null, 2));

        // Validation
        const lab = pl['Laboratory'];
        const admin = pl['Admin'];

        // Lab: Revenue 300, Expense 100 -> Profit 200
        // Admin: Revenue 0, Expense 50 -> Profit -50

        if (lab && lab.revenue === 300 && lab.expenses === 100 && lab.profit === 200) {
            console.log('   PASS: Laboratory P&L correct.');
        } else {
            console.error('   FAIL: Laboratory P&L Incorrect!');
        }

        if (admin && admin.revenue === 0 && admin.expenses === 50 && admin.profit === -50) {
            console.log('   PASS: Admin P&L correct.');
        } else {
            console.error('   FAIL: Admin P&L Incorrect!');
        }

        console.log('--- TEST END ---');

    } catch (err) {
        console.error('TEST FAILED:', err.message);
    }
};

setTimeout(runTest, 5000);
