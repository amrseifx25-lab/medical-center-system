const db = require('../db');

// --- HELPER ---
const buildAccountTree = (accounts) => {
    const map = {};
    const tree = [];
    accounts.forEach(acc => {
        map[acc.id] = { ...acc, children: [] };
    });
    accounts.forEach(acc => {
        if (acc.parent_id && map[acc.parent_id]) {
            map[acc.parent_id].children.push(map[acc.id]);
        } else {
            tree.push(map[acc.id]);
        }
    });
    return tree;
};

// --- CONTROLLERS ---

// Get Chart of Accounts (Tree Structure)
const getChartOfAccounts = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM accounts ORDER BY code ASC');
        const tree = buildAccountTree(result.rows);
        res.json(tree);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

const getJournalEntries = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                je.*, 
                json_agg(
                    json_build_object(
                        'account_id', jl.account_id,
                        'account_name', a.name,
                        'account_code', a.code,
                        'debit', jl.debit,
                        'credit', jl.credit,
                        'description', jl.description
                    )
                ) as lines
            FROM journal_entries je
            LEFT JOIN journal_lines jl ON je.id = jl.entry_id
            LEFT JOIN accounts a ON jl.account_id = a.id
            GROUP BY je.id
            ORDER BY je.date DESC
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
};

// Create Account
const createAccount = async (req, res) => {
    const { code, name, type, parent_id } = req.body;
    try {
        // Build query dynamically based on parent_id presence
        let query = 'INSERT INTO accounts (code, name, type, parent_id) VALUES ($1, $2, $3, $4) RETURNING *';
        let params = [code, name, type, parent_id || null];

        const result = await db.query(query, params);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique constraint violation
            return res.status(400).json({ message: 'Account code already exists.' });
        }
        res.status(500).send('Server Error');
    }
};

// Delete Account
const deleteAccount = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Check if used in Journal Lines
        const checkUsage = await db.query('SELECT 1 FROM journal_lines WHERE account_id = $1 LIMIT 1', [id]);
        if (checkUsage.rows.length > 0) {
            return res.status(400).json({ message: 'Cannot delete account. It is used in existing journal entries.' });
        }

        // 2. Check if it has children
        const checkChildren = await db.query('SELECT 1 FROM accounts WHERE parent_id = $1 LIMIT 1', [id]);
        if (checkChildren.rows.length > 0) {
            return res.status(400).json({ message: 'Cannot delete account. It has sub-accounts. Delete them first.' });
        }

        // 3. Delete
        await db.query('DELETE FROM accounts WHERE id = $1', [id]);
        res.json({ message: 'Account deleted successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Create Journal Entry
const createJournalEntry = async (req, res) => {
    const { date, description, lines } = req.body;

    // Validate Double Entry (Debits must equal Credits)
    const totalDebit = lines.reduce((sum, line) => sum + parseFloat(line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + parseFloat(line.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({ error: 'Entry is not balanced. Debits must equal Credits.' });
    }

    try {
        // 1. Create Entry Header
        const refNum = `JE-${Date.now()}`;
        const entryResult = await db.query(
            'INSERT INTO journal_entries (date, description, reference_number) VALUES ($1, $2, $3) RETURNING id',
            [date, description, refNum]
        );
        const entryId = entryResult.rows[0].id;

        // 2. Create Lines
        for (let line of lines) {
            // Use line-level department if provided, otherwise header department, otherwise 'General'
            const lineDept = line.department || department || 'General';
            await db.query(
                'INSERT INTO journal_lines (entry_id, account_id, debit, credit, department, description) VALUES ($1, $2, $3, $4, $5, $6)',
                [entryId, line.account_id, line.debit || 0, line.credit || 0, lineDept, line.description || null]
            );
        }

        res.json({ message: 'Journal Entry Created', id: entryId, reference_number: refNum });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Get Trial Balance (Report)
const getTrialBalance = async (req, res) => {
    try {
        const query = `
            SELECT 
                a.code, a.name, a.type,
                SUM(jl.debit) as total_debit,
                SUM(jl.credit) as total_credit,
                SUM(jl.debit) - SUM(jl.credit) as net_balance
            FROM accounts a
            LEFT JOIN journal_lines jl ON a.id = jl.account_id
            GROUP BY a.id
            ORDER BY a.code ASC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// --- ACTIONS ---

// Get Expenses
const getExpenses = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        let query = 'SELECT * FROM expenses WHERE 1=1';
        const params = [];

        if (start_date) {
            params.push(start_date);
            query += ` AND date >= $${params.length}`;
        }
        if (end_date) {
            params.push(end_date);
            query += ` AND date <= $${params.length}`;
        }

        query += ' ORDER BY date DESC, created_at DESC';
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Create Expense
const createExpense = async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { date, vendor, category, description, amount, payment_method, department } = req.body;

        await client.query('BEGIN');

        // 1. Check Lock Day
        const checkLock = await client.query('SELECT is_locked FROM daily_closings WHERE date = $1', [date]);
        if (checkLock.rows.length > 0 && checkLock.rows[0].is_locked) {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'Cannot add expense to a closed/locked day.' });
        }

        // 2. Insert Expense with Department
        const isPaid = payment_method !== 'Credit'; // If Credit, then NOT paid
        const dueDate = req.body.due_date || null; // If Credit, due date matters

        const expResult = await client.query(
            `INSERT INTO expenses (date, vendor, category, description, amount, payment_method, department, is_paid, due_date) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [date, vendor, category, description, amount, payment_method, department || 'General', isPaid, dueDate]
        );
        const expense = expResult.rows[0];

        // 3. Auto-Journal Entry
        const categoryMap = {
            'Rent': '501',
            'Utilities': '502',
            'Salaries': '503',
            'Supplies': '504',
            'Maintenance': '505',
            'Other': '506'
        };
        const expenseCode = categoryMap[category] || '506'; // Default Other

        let paymentCode = '101'; // Default Cash
        if (payment_method === 'Bank') paymentCode = '102';
        else if (payment_method === 'Credit') paymentCode = '201'; // Accounts Payable

        // Helper to get ID
        const getAccId = async (code) => {
            const res = await client.query('SELECT id FROM accounts WHERE code = $1', [code]);
            if (res.rows.length === 0) throw new Error(`Account code ${code} not found`);
            return res.rows[0].id;
        };

        const expenseAccId = await getAccId(expenseCode);
        const paymentAccId = await getAccId(paymentCode);

        // ... rest of journal creation (same lines, just different Account ID)
        // Create Entry
        const jeRes = await client.query(
            `INSERT INTO journal_entries (date, description, reference_number) 
             VALUES ($1, $2, $3) RETURNING id`,
            [date, `Expense: ${category} - ${vendor || ''} (${department || 'General'})`, `EXP-${expense.id}`]
        );
        const entryId = jeRes.rows[0].id;

        // Debit Expense (Tagged with Department)
        await client.query(
            'INSERT INTO journal_lines (entry_id, account_id, debit, credit, department) VALUES ($1, $2, $3, 0, $4)',
            [entryId, expenseAccId, amount, department || 'General']
        );

        // Credit Cash/Bank/AP (General)
        await client.query(
            'INSERT INTO journal_lines (entry_id, account_id, debit, credit, department) VALUES ($1, $2, 0, $3, $4)',
            [entryId, paymentAccId, amount, 'General']
        );

        await client.query('COMMIT');
        res.json(expense);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).send(err.message);
    } finally {
        client.release();
    }
};

// Report: Profit & Loss by Department (GL BASED)
const getProfitLoss = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        let query = `
            SELECT 
                jl.department,
                a.type,
                SUM(jl.credit) - SUM(jl.debit) as net_amount
            FROM journal_lines jl
            JOIN journal_entries je ON jl.entry_id = je.id
            JOIN accounts a ON jl.account_id = a.id
            WHERE a.type IN ('Revenue', 'Expense')
        `;
        const params = [];

        if (start_date) {
            params.push(start_date);
            query += ` AND je.date >= $${params.length}`;
        }
        if (end_date) {
            params.push(end_date);
            query += ` AND je.date <= $${params.length}`;
        }

        query += ` GROUP BY jl.department, a.type`;

        const result = await db.query(query, params);

        const report = {};

        result.rows.forEach(row => {
            const dept = row.department || 'General';
            if (!report[dept]) report[dept] = { revenue: 0, expenses: 0, profit: 0 };

            // For Revenue: Credit is positive. Net Amount (Credit - Debit) should be positive.
            // For Expense: Debit is positive. Net Amount (Credit - Debit) would be negative.

            // However, usually we display Expenses as positive numbers in reports (less revenue).
            if (row.type === 'Revenue') {
                report[dept].revenue += Number(row.net_amount);
            } else if (row.type === 'Expense') {
                // Net Amount is likely negative (Debit > Credit). We want magnitude.
                // Or if we strictly sum(debit) for expenses? 
                // Let's use the net_amount directly. If it's -100, it means Expense 100.
                // But wait, Revenue Accounts are usually Credit balance (+). Expense Accounts are Debit balance (-).
                // So net_amount works perfectly for Profit calculation (Revenue + Expense(which is negative) = Profit).
                // But for display "Expenses: 100", we need absolute value.

                // Let's store raw relative values first.
                report[dept].expenses += Number(row.net_amount); // This will be negative
            }
        });

        // Format
        Object.keys(report).forEach(dept => {
            const rev = report[dept].revenue; // e.g. 500
            const expNet = report[dept].expenses; // e.g. -100

            report[dept].profit = rev + expNet; // 500 + (-100) = 400

            // Flip expense sign for display if needed, but the UI expects positive number for "Expenses" label usually?
            // "Expenses: 100" (Red).
            // My previous UI code: `- {data.expenses}`.
            // If data.expenses is 100, UI says "-100".
            // If I send -100 here, UI says "-(-100)" = "+100"?
            // Let's look at UI. UI code: `<span className="text-red-500">-{data.expenses.toLocaleString()}</span>`
            // It puts a minus sign physically. So it expects a positive number.

            report[dept].expenses = Math.abs(expNet);
        });

        res.json(report);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};


// Departments CRUD
const getDepartments = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM departments ORDER BY name');
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
};

const createDepartment = async (req, res) => {
    try {
        const { name } = req.body;
        const result = await db.query('INSERT INTO departments (name) VALUES ($1) RETURNING *', [name]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).send(err.message); }
};

const deleteDepartment = async (req, res) => {
    try {
        await db.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).send(err.message); }
};

// Categories CRUD
const getCategories = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM expense_categories ORDER BY name');
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
};

const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const result = await db.query('INSERT INTO expense_categories (name) VALUES ($1) RETURNING *', [name]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).send(err.message); }
};

const deleteCategory = async (req, res) => {
    try {
        await db.query('DELETE FROM expense_categories WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).send(err.message); }
};

// --- SUPPLIERS MANAGEMENT ---

const getSuppliers = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.*, a.code as account_code, a.name as account_name 
            FROM suppliers s
            LEFT JOIN accounts a ON s.account_id = a.id
            ORDER BY s.name
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
};

const createSupplier = async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { name, commercial_record, address, phone, tax_number, email, nature_of_business } = req.body;

        await client.query('BEGIN');

        // 1. Find or Ensure Parent 'Suppliers Payable' (Code 201)
        let parentRes = await client.query("SELECT id, code FROM accounts WHERE code = '201'");
        let parentId;

        if (parentRes.rows.length === 0) {
            // Create Parent if missing (Migration does it, but foolproof)
            const newParent = await client.query(
                "INSERT INTO accounts (code, name, type) VALUES ('201', 'Suppliers Payable', 'Liability') RETURNING id"
            );
            parentId = newParent.rows[0].id;
        } else {
            parentId = parentRes.rows[0].id;
        }

        // 2. Generate Next Code (e.g. 201001)
        // Find existing children codes
        const childrenRes = await client.query("SELECT code FROM accounts WHERE parent_id = $1", [parentId]);
        let nextCode = '201001';
        if (childrenRes.rows.length > 0) {
            const codes = childrenRes.rows.map(r => parseInt(r.code));
            const maxCode = Math.max(...codes);
            nextCode = (maxCode + 1).toString();
        }

        // 3. Create GL Account
        const accRes = await client.query(
            "INSERT INTO accounts (code, name, type, parent_id) VALUES ($1, $2, 'Liability', $3) RETURNING id",
            [nextCode, name, parentId]
        );
        const accountId = accRes.rows[0].id;

        // 4. Create Supplier Record
        const supRes = await client.query(
            `INSERT INTO suppliers 
            (name, commercial_record, address, phone, tax_number, email, nature_of_business, account_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [name, commercial_record, address, phone, tax_number, email, nature_of_business, accountId]
        );

        await client.query('COMMIT');
        res.json({ ...supRes.rows[0], account_code: nextCode });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).send(err.message);
    } finally {
        client.release();
    }
};

const getAccountStatement = async (req, res) => {
    try {
        const { account_id, start_date, end_date } = req.query;

        if (!account_id) return res.status(400).json({ error: 'Account ID required' });

        // 1. Get Opening Balance (Sum before start_date)
        let openingQuery = `
            SELECT SUM(debit - credit) as balance 
            FROM journal_lines jl
            JOIN journal_entries je ON jl.entry_id = je.id
            WHERE jl.account_id = $1
        `;
        const openingParams = [account_id];

        if (start_date) {
            openingQuery += ` AND je.date < $2`;
            openingParams.push(start_date);
        }

        const openingRes = await db.query(openingQuery, openingParams);
        const openingBalance = Number(openingRes.rows[0].balance || 0);

        // 2. Get Transactions (Between dates)
        let transQuery = `
            SELECT 
                je.date, 
                je.description as header_desc,
                je.reference_number,
                jl.description as line_desc,
                jl.debit, 
                jl.credit,
                jl.department
            FROM journal_lines jl
            JOIN journal_entries je ON jl.entry_id = je.id
            WHERE jl.account_id = $1
        `;
        const transParams = [account_id];
        let paramCount = 1;

        if (start_date) {
            paramCount++;
            transQuery += ` AND je.date >= $${paramCount}`;
            transParams.push(start_date);
        }
        if (end_date) {
            paramCount++;
            transQuery += ` AND je.date <= $${paramCount}`;
            transParams.push(end_date);
        }

        transQuery += ` ORDER BY je.date ASC, je.created_at ASC`;

        const transRes = await db.query(transQuery, transParams);

        // 3. Calculate Running Balance
        let currentBalance = openingBalance;
        const transactions = transRes.rows.map(t => {
            const debit = Number(t.debit);
            const credit = Number(t.credit);

            // For Assets/Expenses: Debit increases. For Liab/Equity/Revenue: Credit increases?
            // Actually, GL usually shows standard Net = Debit - Credit. 
            // Interpretation depends on account type, but raw math is consistent.
            currentBalance += (debit - credit);

            return {
                ...t,
                running_balance: currentBalance
            };
        });

        res.json({
            opening_balance: openingBalance,
            transactions: transactions,
            closing_balance: currentBalance
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Start Month Closing Logic

// 1. Preview Closing (Review P&L for specific month)
const closeMonthPreview = async (req, res) => {
    try {
        const { year, month } = req.query;
        if (!year || !month) return res.status(400).json({ error: 'Year and Month are required' });

        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

        // Fetch Revenue and Expenses for this period
        const result = await db.query(`
            SELECT 
                a.id, a.code, a.name, a.type,
                SUM(jl.debit) as total_debit,
                SUM(jl.credit) as total_credit
            FROM accounts a
            JOIN journal_lines jl ON a.id = jl.account_id
            JOIN journal_entries je ON jl.entry_id = je.id
            WHERE je.date >= $1 AND je.date <= $2
            AND (a.type = 'Revenue' OR a.type = 'Expense')
            GROUP BY a.id, a.code, a.name, a.type
        `, [startDate, endDate]);

        let totalRevenue = 0;
        let totalExpenses = 0;
        const details = [];

        result.rows.forEach(row => {
            const debit = Number(row.total_debit || 0);
            const credit = Number(row.total_credit || 0);
            let balance = 0;

            if (row.type === 'Revenue') {
                balance = credit - debit; // Revenue is Credit nature
                totalRevenue += balance;
            } else {
                balance = debit - credit; // Expense is Debit nature
                totalExpenses += balance;
            }

            details.push({ ...row, balance });
        });

        const netProfit = totalRevenue - totalExpenses;

        res.json({
            period: `${year}-${month}`,
            startDate,
            endDate,
            totalRevenue,
            totalExpenses,
            netProfit,
            details
        });

    } catch (err) { res.status(500).send(err.message); }
};

// 2. Execute Closing (Generate Journal Entry)
const closeMonth = async (req, res) => {
    try {
        const { year, month } = req.body;
        if (!year || !month) return res.status(400).json({ error: 'Year and Month are required' });

        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

        // 2. Calculate Balances to Close
        const result = await db.query(`
            SELECT 
                a.id, a.code, a.name, a.type,
                SUM(jl.debit) as total_debit,
                SUM(jl.credit) as total_credit
            FROM accounts a
            JOIN journal_lines jl ON a.id = jl.account_id
            JOIN journal_entries je ON jl.entry_id = je.id
            WHERE je.date >= $1 AND je.date <= $2
            AND (a.type = 'Revenue' OR a.type = 'Expense')
            GROUP BY a.id, a.code, a.name, a.type
        `, [startDate, endDate]);

        if (result.rows.length === 0) return res.status(400).json({ error: 'No revenue/expense transactions found to close.' });

        // 3. Prepare Journal Lines
        const lines = [];
        let totalRevenue = 0;
        let totalExpenses = 0;

        result.rows.forEach(row => {
            const debit = Number(row.total_debit || 0);
            const credit = Number(row.total_credit || 0);
            let balance = 0;

            if (row.type === 'Revenue') {
                balance = credit - debit; // Credit Balance
                // To close Revenue (Credit), we must DEBIT it
                if (balance !== 0) {
                    lines.push({ account_id: row.id, debit: balance, credit: 0, description: `Closing Revenue - ${row.name}` });
                    totalRevenue += balance;
                }
            } else {
                balance = debit - credit; // Debit Balance
                // To close Expense (Debit), we must CREDIT it
                if (balance !== 0) {
                    lines.push({ account_id: row.id, debit: 0, credit: balance, description: `Closing Expense - ${row.name}` });
                    totalExpenses += balance;
                }
            }
        });

        const netProfit = totalRevenue - totalExpenses;

        // 4. Post Difference to Retained Earnings
        // Find Retained Earnings Account
        const reAccount = await db.query("SELECT id FROM accounts WHERE code = '303' LIMIT 1");
        if (reAccount.rows.length === 0) return res.status(500).json({ error: 'Retained Earnings account (303) not found.' });
        const reId = reAccount.rows[0].id;

        if (netProfit > 0) {
            // Profit: Credit Retained Earnings
            lines.push({ account_id: reId, debit: 0, credit: netProfit, description: `Net Profit Allocation - ${year}-${month}` });
        } else if (netProfit < 0) {
            // Loss: Debit Retained Earnings
            lines.push({ account_id: reId, debit: Math.abs(netProfit), credit: 0, description: `Net Loss Allocation - ${year}-${month}` });
        }

        // 5. Create Journal Entry
        // Insert Header
        const entryRes = await db.query(
            "INSERT INTO journal_entries (date, description, reference_number) VALUES ($1, $2, $3) RETURNING id",
            [endDate, `Closing Entry - ${year}-${month}`, `CLOSE-${year}${month}`]
        );
        const entryId = entryRes.rows[0].id;

        // Insert Lines
        for (const line of lines) {
            await db.query(
                "INSERT INTO journal_lines (entry_id, account_id, debit, credit, description) VALUES ($1, $2, $3, $4, $5)",
                [entryId, line.account_id, line.debit, line.credit, line.description]
            );
        }

        res.json({ message: 'Month Closed Successfully', journal_id: entryId, netProfit });

    } catch (err) { res.status(500).send(err.message); }
};

const reviseJournalEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { description, reason } = req.body;
        if (!description || !reason) return res.status(400).json({ error: 'Description and Reason required' });

        await db.query('UPDATE journal_entries SET description = $1 WHERE id = $2', [description, id]);

        res.json({ message: 'Entry revised successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 9. Supplier Aging Report
const getSupplierAging = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                vendor,
                amount,
                due_date,
                date as invoice_date
            FROM expenses
            WHERE is_paid = false
        `);

        const agingData = {};
        const today = new Date();

        result.rows.forEach(exp => {
            const dueDate = new Date(exp.due_date || exp.invoice_date);
            let bucket = '0-30';
            let daysOverdue = 0;

            if (today > dueDate) {
                daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
            }

            if (daysOverdue <= 30) bucket = '0-30';
            else if (daysOverdue <= 60) bucket = '31-60';
            else if (daysOverdue <= 90) bucket = '61-90';
            else bucket = '90+';

            if (!agingData[exp.vendor]) {
                agingData[exp.vendor] = { vendor: exp.vendor, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 };
            }

            agingData[exp.vendor][bucket] += parseFloat(exp.amount);
            agingData[exp.vendor].total += parseFloat(exp.amount);
        });

        res.json(Object.values(agingData));
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// 10. Balance Sheet
const getBalanceSheet = async (req, res) => {
    try {
        const balancesRes = await db.query(`
            SELECT 
                a.id, a.code, a.name, a.type,
                COALESCE(SUM(jl.debit), 0) as total_debit,
                COALESCE(SUM(jl.credit), 0) as total_credit
            FROM accounts a
            LEFT JOIN journal_lines jl ON a.id = jl.account_id
            GROUP BY a.id, a.code, a.name, a.type
            ORDER BY a.code
        `);

        const accounts = balancesRes.rows.map(acc => ({
            ...acc,
            total_debit: parseFloat(acc.total_debit),
            total_credit: parseFloat(acc.total_credit)
        }));

        let totalRevenue = 0;
        let totalExpense = 0;

        accounts.forEach(acc => {
            if (acc.type === 'Revenue') {
                totalRevenue += (acc.total_credit - acc.total_debit);
            } else if (acc.type === 'Expense') {
                totalExpense += (acc.total_debit - acc.total_credit);
            }
        });

        const netIncome = totalRevenue - totalExpense;

        const balanceSheet = {
            assets: [],
            liabilities: [],
            equity: [],
            totals: { assets: 0, liabilities: 0, equity: 0 }
        };

        accounts.forEach(acc => {
            let balance = 0;
            if (acc.type === 'Asset') {
                balance = acc.total_debit - acc.total_credit;
                if (balance !== 0) {
                    balanceSheet.assets.push({ ...acc, balance });
                    balanceSheet.totals.assets += balance;
                }
            } else if (acc.type === 'Liability') {
                balance = acc.total_credit - acc.total_debit;
                if (balance !== 0) {
                    balanceSheet.liabilities.push({ ...acc, balance });
                    balanceSheet.totals.liabilities += balance;
                }
            } else if (acc.type === 'Equity') {
                balance = acc.total_credit - acc.total_debit;
                if (balance !== 0) {
                    balanceSheet.equity.push({ ...acc, balance });
                    balanceSheet.totals.equity += balance;
                }
            }
        });

        if (netIncome !== 0) {
            balanceSheet.equity.push({ code: '99999', name: 'Retained Earnings (Current Period)', type: 'Equity', balance: netIncome });
            balanceSheet.totals.equity += netIncome;
        }

        res.json(balanceSheet);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getChartOfAccounts,
    createAccount,
    deleteAccount,
    createJournalEntry,
    getTrialBalance,
    getExpenses,
    createExpense,
    getProfitLoss,
    getDepartments,
    createDepartment,
    deleteDepartment,
    getCategories,
    createCategory,
    deleteCategory,
    reviseJournalEntry,
    getJournalEntries,
    getSupplierAging,
    getBalanceSheet,
    createSupplier,
    getSuppliers,
    getAccountStatement,
    closeMonthPreview,
    closeMonth
};
