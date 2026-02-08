const db = require('../db');

// --- EGYPTIAN PAYROLL CONFIGURATION (2025) ---
const PAYROLL_CONFIG = {
    INSURANCE: {
        EMPLOYEE_SHARE: 0.11,
        COMPANY_SHARE: 0.1875,
        MIN_LIMIT: 2300,
        MAX_LIMIT: 14500
    },
    // Annual Tax Brackets (EGP) - Simplified
    TAX_BRACKETS: [
        { limit: 40000, rate: 0 },
        { limit: 55000, rate: 0.10 },
        { limit: 70000, rate: 0.15 },
        { limit: 200000, rate: 0.20 },
        { limit: 400000, rate: 0.225 },
        { limit: 1200000, rate: 0.25 },
        { limit: Infinity, rate: 0.275 }
    ],
    PERSONAL_EXEMPTION: 20000 // Annual
};

// --- HELPER FUNCTIONS ---

const calculateSocialInsurance = (insuranceSalary) => {
    // Apply Limits
    let salary = Math.max(PAYROLL_CONFIG.INSURANCE.MIN_LIMIT,
        Math.min(insuranceSalary, PAYROLL_CONFIG.INSURANCE.MAX_LIMIT));

    return {
        employeeShare: salary * PAYROLL_CONFIG.INSURANCE.EMPLOYEE_SHARE,
        companyShare: salary * PAYROLL_CONFIG.INSURANCE.COMPANY_SHARE
    };
};

const calculateIncomeTax = (annualTaxableIncome) => {
    let income = annualTaxableIncome - PAYROLL_CONFIG.PERSONAL_EXEMPTION;
    if (income <= 0) return 0;

    let tax = 0;
    let previousLimit = 0;

    for (let bracket of PAYROLL_CONFIG.TAX_BRACKETS) {
        if (income > previousLimit) {
            let taxableChunk = Math.min(income, bracket.limit) - previousLimit;
            tax += taxableChunk * bracket.rate;
            previousLimit = bracket.limit;
        } else {
            break;
        }
    }
    return tax / 12; // Monthly Tax
};

// --- CONTROLLERS ---

// Get all employees
const getAllEmployees = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM employees ORDER BY join_date DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
// Get Departments
const getDepartments = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM departments ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Update Employee
const updateEmployee = async (req, res) => {
    const { id } = req.params;
    const { full_name, position, join_date, basic_salary, variable_salary, insurance_salary, department_id } = req.body;
    try {
        const result = await db.query(
            `UPDATE employees SET 
                full_name = $1, position = $2, join_date = $3, 
                basic_salary = $4, variable_salary = $5, insurance_salary = $6, department_id = $7
            WHERE id = $8 RETURNING *`,
            [full_name, position, join_date, basic_salary, variable_salary || 0, insurance_salary || 0, department_id || null, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Create Employee
const createEmployee = async (req, res) => {
    const { full_name, position, join_date, basic_salary, variable_salary, insurance_salary, department_id } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO employees (full_name, position, join_date, basic_salary, variable_salary, insurance_salary, department_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [full_name, position, join_date, basic_salary, (variable_salary === '' ? 0 : variable_salary) || 0, (insurance_salary === '' ? 0 : insurance_salary) || 0, department_id || null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Generate Salary Slip
const generateSalarySlip = async (req, res) => {
    const { employee_id, month, year } = req.body;

    try {
        // 1. Get Employee Data
        const empResult = await db.query('SELECT * FROM employees WHERE id = $1', [employee_id]);
        if (empResult.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
        const employee = empResult.rows[0];

        // 2. Calculate Gross Income
        const grossSalary = parseFloat(employee.basic_salary) + parseFloat(employee.variable_salary);

        // 3. Calculate Deductions
        // Social Insurance
        const insurance = calculateSocialInsurance(parseFloat(employee.insurance_salary));

        // Income Tax
        // Annualize income, deduct insurance (employee share is tax exempt), deduct exemption
        const monthlyTaxable = grossSalary - insurance.employeeShare; // Insurance is tax deductible
        const annualTaxable = monthlyTaxable * 12;
        const incomeTax = calculateIncomeTax(annualTaxable);

        // 4. Net Salary
        const netSalary = grossSalary - insurance.employeeShare - incomeTax;

        // 5. Save to DB
        const result = await db.query(
            `INSERT INTO salary_slips 
            (employee_id, month, year, gross_salary, insurance_employee_share, income_tax, net_salary) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [employee_id, month, year, gross_salary, insurance.employeeShare, incomeTax, netSalary]
        );

        res.json({
            slip: result.rows[0],
            details: {
                gross: grossSalary,
                insurance: insurance.employeeShare,
                tax: incomeTax,
                net: netSalary
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// --- PAYROLL CONTROLLERS ---

// 1. Initialize Payroll Period
const createPayrollPeriod = async (req, res) => {
    const { month, year } = req.body;
    try {
        const check = await db.query('SELECT * FROM payroll_periods WHERE month = $1 AND year = $2', [month, year]);
        if (check.rows.length > 0) return res.status(400).json({ error: 'Payroll period already exists' });

        const result = await db.query(
            'INSERT INTO payroll_periods (month, year) VALUES ($1, $2) RETURNING *',
            [month, year]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// 2. Get Payroll Period & Summary
const getPayrollPeriod = async (req, res) => {
    const { month, year } = req.query;
    try {
        const periodRes = await db.query('SELECT * FROM payroll_periods WHERE month = $1 AND year = $2', [month, year]);
        if (periodRes.rows.length === 0) return res.json(null);

        const period = periodRes.rows[0];
        const slipsRes = await db.query('SELECT COUNT(*) as count, SUM(net_salary) as total_net FROM salary_slips WHERE payroll_period_id = $1', [period.id]);

        res.json({ ...period, summary: slipsRes.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// 3. Update Attendance
const updateAttendance = async (req, res) => {
    const { employee_id, month, year, days_present, days_absent, days_off, days_holiday, days_unpaid, days_work_on_off, days_work_on_holiday, action_work_on_off } = req.body;
    try {
        const result = await db.query(`
            INSERT INTO employee_attendance (employee_id, month, year, days_present, days_absent, days_off, days_holiday, days_unpaid, days_work_on_off, days_work_on_holiday, action_work_on_off)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (employee_id, month, year) 
            DO UPDATE SET 
                days_present = EXCLUDED.days_present,
                days_absent = EXCLUDED.days_absent,
                days_off = EXCLUDED.days_off,
                days_holiday = EXCLUDED.days_holiday,
                days_unpaid = EXCLUDED.days_unpaid,
                days_work_on_off = EXCLUDED.days_work_on_off,
                days_work_on_holiday = EXCLUDED.days_work_on_holiday,
                action_work_on_off = EXCLUDED.action_work_on_off
            RETURNING *
        `, [
            employee_id, month, year,
            days_present || 0, days_absent || 0, days_off || 0, days_holiday || 0, days_unpaid || 0,
            days_work_on_off || 0, days_work_on_holiday || 0, action_work_on_off || 'Pay'
        ]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// 3.5 Get Attendance
const getAttendance = async (req, res) => {
    const { month, year } = req.query;
    try {
        const result = await db.query('SELECT * FROM employee_attendance WHERE month = $1 AND year = $2', [month, year]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// 4. Calculate Payroll
const calculatePayroll = async (req, res) => {
    const { month, year } = req.body;
    try {
        let periodRes = await db.query('SELECT * FROM payroll_periods WHERE month = $1 AND year = $2', [month, year]);
        let periodId;
        if (periodRes.rows.length === 0) {
            const newPeriod = await db.query('INSERT INTO payroll_periods (month, year) VALUES ($1, $2) RETURNING id', [month, year]);
            periodId = newPeriod.rows[0].id;
        } else {
            periodId = periodRes.rows[0].id;
            if (periodRes.rows[0].status === 'Closed') return res.status(400).json({ error: 'Payroll is closed' });
        }

        const employees = await db.query('SELECT * FROM employees');
        const codesRes = await db.query('SELECT * FROM payroll_codes');
        const codes = codesRes.rows;

        // Helper to find code by fuzzy name or type
        const findCode = (namePart, type) => codes.find(c => c.name.toLowerCase().includes(namePart) && c.type === type);

        // Default Codes (if not found in DB, use placeholders)
        // In real app, we should seed these or allow config.

        for (const emp of employees.rows) {
            const attRes = await db.query('SELECT * FROM employee_attendance WHERE employee_id = $1 AND month = $2 AND year = $3', [emp.id, month, year]);
            const att = attRes.rows[0] || { days_present: 30, days_off: 0, days_holiday: 0, days_work_on_off: 0, days_work_on_holiday: 0, action_work_on_off: 'Pay' };

            // 1. Attendance Calculation
            const daysPresent = att.days_present || 0;
            const daysOff = att.days_off || 0;
            const daysHoliday = att.days_holiday || 0;
            const paidDays = daysPresent + daysOff + daysHoliday; // Capped at 30? Logic says Paid + Unpaid = 30.

            const basicSalary = parseFloat(emp.basic_salary) || 0;
            const dailyRate = basicSalary / 30;
            const attendanceSalary = dailyRate * paidDays;

            // 2. Earnings
            let earningsDetails = [];

            // Basic
            const basicCode = findCode('basic', 'Earning') || { code: 'BASIC', name: 'الراتب الأساسي', id: null };
            earningsDetails.push({
                payroll_code_id: basicCode.id,
                code: basicCode.code,
                name: basicCode.name,
                amount: attendanceSalary.toFixed(2)
            });

            // Variable
            if (emp.variable_salary > 0) {
                const varCode = findCode('variable', 'Earning') || { code: 'VAR', name: 'راتب متغير', id: null };
                earningsDetails.push({
                    payroll_code_id: varCode.id,
                    code: varCode.code,
                    name: varCode.name,
                    amount: parseFloat(emp.variable_salary).toFixed(2)
                });
            }

            // Work on Off/Holiday (Overtime)
            const workOnOff = (att.days_work_on_off || 0) + (att.days_work_on_holiday || 0);
            if (att.action_work_on_off === 'Pay' && workOnOff > 0) {
                const otAmount = dailyRate * workOnOff; // Multiplier 1.0 for now
                const otCode = findCode('overtime', 'Earning') || findCode('holiday', 'Earning') || { code: 'OT', name: 'عمل إضافي/إجازات', id: null };
                earningsDetails.push({
                    payroll_code_id: otCode.id,
                    code: otCode.code,
                    name: otCode.name,
                    amount: otAmount.toFixed(2)
                });
            }

            // 3. Deductions
            let deductionsDetails = [];

            // Social Insurance
            const insurance = calculateSocialInsurance(parseFloat(emp.insurance_salary));
            const insCode = findCode('insurance', 'Deduction') || { code: 'INS', name: 'تأمين اجتماعي', id: null };
            deductionsDetails.push({
                payroll_code_id: insCode.id,
                code: insCode.code,
                name: insCode.name,
                amount: insurance.employeeShare.toFixed(2)
            });

            // Income Tax
            const grossForTax = parseFloat(emp.basic_salary) + parseFloat(emp.variable_salary); // Approx
            const monthlyTaxable = grossForTax - insurance.employeeShare;
            const incomeTax = calculateIncomeTax(monthlyTaxable * 12);

            const taxCode = findCode('tax', 'Deduction') || { code: 'TAX', name: 'ضريبة الدخل', id: null };
            deductionsDetails.push({
                payroll_code_id: taxCode.id,
                code: taxCode.code,
                name: taxCode.name,
                amount: incomeTax.toFixed(2)
            });

            // 4. Totals
            const totalEarnings = earningsDetails.reduce((sum, item) => sum + parseFloat(item.amount), 0);
            const totalDeductions = deductionsDetails.reduce((sum, item) => sum + parseFloat(item.amount), 0);
            const netSalary = totalEarnings - totalDeductions;

            const existingSlipRes = await db.query('SELECT * FROM salary_slips WHERE payroll_period_id = $1 AND employee_id = $2', [periodId, emp.id]);

            // Extract specific deductions for legacy columns
            const insuranceDed = deductionsDetails.find(d => d.code === 'INS')?.amount || 0;
            const taxDed = deductionsDetails.find(d => d.code === 'TAX')?.amount || 0;

            if (existingSlipRes.rows.length > 0) {
                await db.query(`
                    UPDATE salary_slips SET 
                        basic_salary_snapshot = $1, payable_days = $2, calculated_basic_salary = $3,
                        earnings_details = $4, deductions_details = $5,
                        total_allowances = $6, total_deductions = $7, net_salary = $8, cash_paid = $8,
                        month = $10, year = $11,
                        gross_salary = $6, insurance_employee_share = $12, income_tax = $13
                    WHERE id = $9
                `, [basicSalary, paidDays, attendanceSalary,
                    JSON.stringify(earningsDetails), JSON.stringify(deductionsDetails),
                    totalEarnings, totalDeductions, netSalary, existingSlipRes.rows[0].id,
                    month, year, insuranceDed, taxDed]);
            } else {
                await db.query(`
                    INSERT INTO salary_slips (payroll_period_id, employee_id, basic_salary_snapshot, payable_days, calculated_basic_salary, earnings_details, deductions_details, total_allowances, total_deductions, net_salary, cash_paid, month, year, gross_salary, insurance_employee_share, income_tax)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $8, $14, $15)
                `, [periodId, emp.id, basicSalary, paidDays, attendanceSalary,
                    JSON.stringify(earningsDetails), JSON.stringify(deductionsDetails),
                    totalEarnings, totalDeductions, netSalary, netSalary, month, year, insuranceDed, taxDed]);
            }
        }
        res.json({ message: 'Payroll Calculated Successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
};

// 5. Get Salary Slips
const getPayrollSheet = async (req, res) => {
    const { month, year } = req.query;
    try {
        const periodRes = await db.query('SELECT id FROM payroll_periods WHERE month = $1 AND year = $2', [month, year]);
        if (periodRes.rows.length === 0) return res.json([]);

        const result = await db.query(`
            SELECT s.*, e.full_name, e.position, d.name as department_name
            FROM salary_slips s
            JOIN employees e ON s.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE s.payroll_period_id = $1
            ORDER BY d.name, e.full_name
        `, [periodRes.rows[0].id]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// 6. Update Slip Details
const updateSalarySlip = async (req, res) => {
    const { id } = req.params;
    const { allowances, deductions } = req.body;
    try {
        const slipRes = await db.query('SELECT calculated_basic_salary FROM salary_slips WHERE id = $1', [id]);
        if (slipRes.rows.length === 0) return res.status(404).send('Slip not found');

        const totalAllowances = allowances.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        const totalDeductions = deductions.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

        const calcBasic = parseFloat(slipRes.rows[0].calculated_basic_salary);
        const netSalary = calcBasic + totalAllowances - totalDeductions;

        const result = await db.query(`
            UPDATE salary_slips SET 
                allowances = $1, deductions = $2, 
                total_allowances = $3, total_deductions = $4, 
                net_salary = $5
            WHERE id = $6 RETURNING *
        `, [JSON.stringify(allowances), JSON.stringify(deductions), totalAllowances, totalDeductions, netSalary, id]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// 7. Close Payroll Period & Post to GL
const closePayrollPeriod = async (req, res) => {
    const { month, year } = req.body;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get Period
        const periodRes = await client.query('SELECT * FROM payroll_periods WHERE month = $1 AND year = $2', [month, year]);
        if (periodRes.rows.length === 0) throw new Error('Period not found');
        const period = periodRes.rows[0];
        if (period.status === 'Closed') throw new Error('Payroll already closed');

        // 2. Get Slips & Aggregation
        const slipsRes = await client.query(`
            SELECT s.*, e.department_id 
            FROM salary_slips s
            JOIN employees e ON s.employee_id = e.id
            WHERE s.payroll_period_id = $1
        `, [period.id]);

        const slips = slipsRes.rows;
        if (slips.length === 0) throw new Error('No salary slips found');

        // 3. Aggregate Entries
        const entries = {}; // Key: "accountId_deptId", Value: { account_id, department_id, debit, credit }

        const addToEntry = (accountId, deptId, amount, type) => {
            if (!accountId) return; // Skip if no GL link
            const key = `${accountId}_${deptId || 'null'}`;
            if (!entries[key]) {
                entries[key] = { account_id: accountId, department_id: deptId, debit: 0, credit: 0 };
            }
            if (type === 'Dr') entries[key].debit += amount;
            else entries[key].credit += amount;
        };

        let totalNetPay = 0;

        for (const slip of slips) {
            // Earnings (Dr Expense)
            const earnings = slip.earnings_details || [];
            for (const item of earnings) {
                // Determine Dept: Employee Dept.
                addToEntry(item.payroll_code_id, slip.department_id, parseFloat(item.amount), 'Dr');
            }

            // Deductions (Cr Liability)
            const deductions = slip.deductions_details || [];
            for (const item of deductions) {
                addToEntry(item.payroll_code_id, slip.department_id, parseFloat(item.amount), 'Cr');
            }

            totalNetPay += parseFloat(slip.net_salary);

            // 3.5 Update Time Off Balance if Credit
            // We need to fetch attendance to see 'Credit' days? 
            // Or we assume calculatePayroll handled logic? 
            // User requirement: "If Credit -> store in balance".
            // Since calculatePayroll doesn't store logic, we should do it here or inside calculatePayroll.
            // Let's do it here by refetching attendance.

            const attRes = await client.query('SELECT days_work_on_off, days_work_on_holiday, action_work_on_off FROM employee_attendance WHERE employee_id = $1 AND month = $2 AND year = $3', [slip.employee_id, month, year]);
            if (attRes.rows.length > 0) {
                const att = attRes.rows[0];
                if (att.action_work_on_off === 'Credit') {
                    const creditDays = (parseFloat(att.days_work_on_off) || 0) + (parseFloat(att.days_work_on_holiday) || 0);
                    if (creditDays > 0) {
                        await client.query('UPDATE employees SET time_off_balance = time_off_balance + $1 WHERE id = $2', [creditDays, slip.employee_id]);
                    }
                }
            }
        }

        // 4. Credit Cash (Net Pay)
        // Find a Cash Account (Treasury) - Hardcoded or Config? 
        // Let's look for an account with type 'Asset' and name like 'Cash' or 'Treasury' or 'Khazina'
        const cashAccRes = await client.query("SELECT id FROM accounts WHERE type = 'Asset' AND (name ILIKE '%Cash%' OR name ILIKE '%Treasury%' OR name ILIKE '%خزينة%') LIMIT 1");
        if (cashAccRes.rows.length === 0) throw new Error('No Cash/Treasury GL Account found for posting.');
        const cashAccountId = cashAccRes.rows[0].id;

        addToEntry(cashAccountId, null, totalNetPay, 'Cr');

        // 5. Create Journal Entry
        // Use accountingController logic or direct insert? Direct insert is safer here to keep transaction.
        const journalRes = await client.query(`
            INSERT INTO journal_entries (date, description, reference_number)
            VALUES (NOW(), $1, $2) RETURNING id
        `, [`Payroll Closing - ${month}/${year}`, `PAYROLL-${month}-${year}`]);
        const journalId = journalRes.rows[0].id;

        for (const key in entries) {
            const line = entries[key];
            if (line.debit === 0 && line.credit === 0) continue;

            // Net Debit/Credit per line
            await client.query(`
                INSERT INTO journal_lines (entry_id, account_id, department_id, debit, credit, description)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [journalId, line.account_id, line.department_id, line.debit, line.credit, `Payroll ${month}/${year}`]);
        }

        // 6. Update Period Status
        await client.query('UPDATE payroll_periods SET status = \'Closed\' WHERE id = $1', [period.id]);

        await client.query('COMMIT');
        res.json({ message: 'Payroll Closed and Posted Successfully', journal_id: journalId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

module.exports = {
    getAllEmployees,
    createEmployee,
    generateSalarySlip,
    createPayrollPeriod,
    getPayrollPeriod,
    updateAttendance,
    getAttendance,
    calculatePayroll,
    getPayrollSheet,
    updateSalarySlip,
    updateSalarySlip,
    closePayrollPeriod,
    getDepartments,
    updateEmployee
};
