
const API_URL = 'http://localhost:5000/api';

const runTest = async () => {
    try {
        console.log('--- TEST START: ACCOUNTING OVERHAUL ---');

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

        // 1. Create Patient & Invoice
        console.log('1. Creating Patient & Invoice...');
        const patient = await post('/patients', { full_name: 'Accounting Test Patient', phone: '999', age: 30, gender: 'Male' });
        const service = await post('/services', { name: 'Consultation', price: 200, category: 'Other' });

        const invoiceRes = await post('/invoices', {
            patient_id: patient.id,
            items: [{ service_id: service.id, service_name: service.name, unit_price: 200, quantity: 1 }]
        });
        const invoiceId = invoiceRes.invoice.id;
        console.log('   Invoice Created:', invoiceId);

        // 2. Settle Invoice (Generate Auto-Journal)
        console.log('2. Settling Invoice (Cash)...');
        await put(`/invoices/${invoiceId}/settle`, { payment_method: 'Cash' });
        console.log('   Invoice Settled.');

        // 3. Create Expense (Generate Auto-Journal)
        console.log('3. Creating Expense...');
        const expense = await post('/accounting/expenses', {
            date: new Date().toISOString().split('T')[0],
            vendor: 'Power Co',
            category: 'Utilities',
            description: 'Monthly Bill',
            amount: 500,
            payment_method: 'Cash'
        });
        console.log('   Expense Created:', expense.id);

        // 4. Verify Trial Balance
        console.log('4. Verifying Trial Balance...');
        const trialBalance = await get('/accounting/reports/trial-balance');

        const cashAcc = trialBalance.find(r => r.code === '101'); // Cash
        const revAcc = trialBalance.find(r => r.code === '401'); // Revenue
        const utilAcc = trialBalance.find(r => r.code === '502'); // Utilities

        console.log('   Cash Balance:', cashAcc ? cashAcc.net_balance : 'Not Found');
        console.log('   Revenue Balance:', revAcc ? revAcc.net_balance : 'Not Found');
        console.log('   Utilities Balance:', utilAcc ? utilAcc.net_balance : 'Not Found');

        // Logic Check:
        // Cash should be: +200 (Invoice) - 500 (Expense) = -300
        // Revenue: -200 (Credit is negative usually in DB storage if simplistic, but here we store debit/credit separately)
        // Actually, net_balance = debit - credit.
        // Cash: Debit 200, Credit 500 -> Net -300.
        // Revenue: Credit 200 -> Net -200.
        // Utilities: Debit 500 -> Net 500.

        if (Number(cashAcc.net_balance) === -300 && Number(revAcc.net_balance) === -200 && Number(utilAcc.net_balance) === 500) {
            console.log('   PASS: All balances match expected accounting logic!');
        } else {
            console.error('   FAIL: Balances do not match expectations.');
        }

        console.log('--- TEST END ---');

    } catch (err) {
        console.error('TEST FAILED:', err.message);
    }
};

setTimeout(runTest, 5000);
