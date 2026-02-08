const { pool } = require('../db');

// Create a new Invoice
const createInvoice = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { patient_id, items, coupon_code, payment_method, doctor_id } = req.body;
        // items = [{ service_id, service_name, unit_price, quantity }]

        // 1. Calculate Total
        let total_amount = 0;
        items.forEach(item => {
            total_amount += Number(item.unit_price) * Number(item.quantity || 1);
        });

        // 2. Apply Coupon if exists
        let discount_amount = 0;
        let coupon_id = null;

        if (coupon_code) {
            const couponRes = await client.query('SELECT * FROM coupons WHERE code = $1', [coupon_code]);
            if (couponRes.rows.length > 0) {
                const coupon = couponRes.rows[0];

                // Validate Coupon
                if (coupon.is_active &&
                    (!coupon.expiry_date || new Date(coupon.expiry_date) >= new Date()) &&
                    (coupon.usage_limit === 0 || coupon.used_count < coupon.usage_limit)) {

                    coupon_id = coupon.id;
                    if (coupon.discount_type === 'percentage') {
                        discount_amount = total_amount * (Number(coupon.value) / 100);
                    } else {
                        discount_amount = Number(coupon.value);
                    }

                    // Increment usage
                    await client.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1', [coupon.id]);
                }
            }
        }

        const final_amount = Math.max(0, total_amount - discount_amount);
        const status = payment_method ? 'paid' : 'unpaid';
        const paid_at = payment_method ? new Date() : null;

        // 3. Insert Invoice
        const invoiceRes = await client.query(
            `INSERT INTO invoices (patient_id, total_amount, discount_amount, final_amount, status, payment_method, paid_at, coupon_id, doctor_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [patient_id, total_amount, discount_amount, final_amount, status, payment_method, paid_at, coupon_id, doctor_id]
        );
        const invoice = invoiceRes.rows[0];

        // 4. Insert Invoice Items & Create Automated Requests
        for (const item of items) {
            // Get service details to check category
            const serviceRes = await client.query('SELECT category FROM services WHERE id = $1', [item.service_id]);
            const category = serviceRes.rows[0]?.category;

            await client.query(
                `INSERT INTO invoice_items (invoice_id, service_id, service_name, unit_price, quantity, subtotal)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [invoice.id, item.service_id, item.service_name, item.unit_price, item.quantity || 1, Number(item.unit_price) * Number(item.quantity || 1)]
            );

            // Automated Request Generation
            if (category === 'Radiology') {
                // Create Visit (or reuse if we had logic for it, but for now new visit per request is safer/simpler for this refactor)
                const visitRes = await client.query(
                    'INSERT INTO visits (patient_id, type, status, visit_date) VALUES ($1, $2, $3, NOW()) RETURNING id',
                    [patient_id, 'radiology', 'pending']
                );
                const visitId = visitRes.rows[0].id;

                await client.query(
                    'INSERT INTO radiology_requests (visit_id, service_type, status) VALUES ($1, $2, $3)',
                    [visitId, item.service_name, 'pending']
                );
            } else if (category === 'Lab') {
                const visitRes = await client.query(
                    'INSERT INTO visits (patient_id, type, status, visit_date) VALUES ($1, $2, $3, NOW()) RETURNING id',
                    [patient_id, 'lab', 'pending']
                );
                const visitId = visitRes.rows[0].id;

                await client.query(
                    'INSERT INTO lab_requests (visit_id, test_type) VALUES ($1, $2)',
                    [visitId, item.service_name]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Invoice created successfully', invoice });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
};

// Get Invoices (with filters)
const getInvoices = async (req, res) => {
    try {
        const { status, patient_id } = req.query;
        let query = `
            SELECT i.*, p.full_name as patient_name 
            FROM invoices i
            JOIN patients p ON i.patient_id = p.id
            WHERE 1=1
        `;
        const values = [];
        let index = 1;

        if (status) {
            query += ` AND i.status = $${index++}`;
            values.push(status);
        }
        if (patient_id) {
            query += ` AND i.patient_id = $${index++}`;
            values.push(patient_id);
        }

        query += ` ORDER BY i.created_at DESC`;

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Settle (Pay) Invoice
const settleInvoice = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { payment_method, employee_id } = req.body;

        const cashier_id = req.user.id; // From verifyToken

        await client.query('BEGIN');

        // 1. Update Invoice Status
        const result = await client.query(
            `UPDATE invoices 
             SET status = 'paid', payment_method = $1, employee_id = $2, cashier_id = $3, paid_at = NOW() 
             WHERE id = $4 RETURNING *`,
            [payment_method, employee_id || null, cashier_id, id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).send('Invoice not found');
        }
        const invoice = result.rows[0];

        // 2. Accounting: Auto-Journal Entry

        // Helper to get Account ID by Code
        const getAccId = async (code) => {
            const res = await client.query('SELECT id FROM accounts WHERE code = $1', [code]);
            if (res.rows.length === 0) throw new Error(`Account code ${code} not found`);
            return res.rows[0].id;
        };

        // Identify Debit Account based on Payment Method
        let debitCode = '101'; // Default Cash
        if (payment_method === 'Cash') debitCode = '101';
        else if (payment_method.includes('Owner')) debitCode = '103'; // Owner Receivable
        else if (payment_method === 'Employee Deduction') debitCode = '104'; // Employee Receivable

        const debitAccId = await getAccId(debitCode);
        const revenueAccId = await getAccId('401'); // Medical Services Revenue
        const discountAccId = await getAccId('601'); // Discounts Given

        // Prepare Journal Lines
        const lines = [];

        // DEBIT: Payment Received (Cash/Receivable)
        if (Number(invoice.final_amount) > 0) {
            lines.push({ account_id: debitAccId, debit: invoice.final_amount, credit: 0, department: 'General' });
        }

        // DEBIT: Discount (if any)
        if (Number(invoice.discount_amount) > 0) {
            lines.push({ account_id: discountAccId, debit: invoice.discount_amount, credit: 0, department: 'General' });
        }

        // CREDIT: Revenue SPLIT by Department
        // Fetch items with categories
        const itemsRes = await client.query(`
            SELECT ii.*, s.category 
            FROM invoice_items ii
            JOIN services s ON ii.service_id = s.id
            WHERE ii.invoice_id = $1
        `, [id]);

        const revenueByDept = {};
        let totalRevenueCheck = 0;

        itemsRes.rows.forEach(item => {
            // Map Category to Department
            let dept = 'General';
            if (item.category === 'Lab') dept = 'Laboratory';
            else if (item.category === 'Radiology') dept = 'Radiology';

            if (!revenueByDept[dept]) revenueByDept[dept] = 0;
            revenueByDept[dept] += Number(item.subtotal);
            totalRevenueCheck += Number(item.subtotal);
        });

        // Add Credit Lines
        for (const [dept, amount] of Object.entries(revenueByDept)) {
            if (amount > 0) {
                lines.push({ account_id: revenueAccId, debit: 0, credit: amount, department: dept });
            }
        }

        // Correction for floating point if needed? 
        // Total Invoice Amount = sum(subtotal). total_amount in DB is that.
        // We trust the math matches.

        // Create Journal Entry
        const jeRes = await client.query(
            `INSERT INTO journal_entries (date, description, reference_number, created_by) 
             VALUES (NOW(), $1, $2, $3) RETURNING id`,
            [`Invoice Payment #${invoice.id.slice(0, 8)} - ${payment_method}`, `INV-${invoice.id.slice(0, 8)}`, null]
        );
        const entryId = jeRes.rows[0].id;

        // Insert Lines with Department
        for (const line of lines) {
            await client.query(
                `INSERT INTO journal_lines (entry_id, account_id, debit, credit, department) VALUES ($1, $2, $3, $4, $5)`,
                [entryId, line.account_id, line.debit, line.credit, line.department || 'General']
            );
        }

        await client.query('COMMIT');
        res.json(invoice);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send(err.message || 'Server Error');
    } finally {
        client.release();
    }
};

// Get Invoice Details
const getInvoiceDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const invoiceRes = await pool.query(
            `SELECT i.*, p.full_name as patient_name, c.code as coupon_code
             FROM invoices i 
             JOIN patients p ON i.patient_id = p.id 
             LEFT JOIN coupons c ON i.coupon_id = c.id
             WHERE i.id = $1`,
            [id]
        );

        if (invoiceRes.rows.length === 0) return res.status(404).send('Invoice not found');

        const itemsRes = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);

        res.json({ ...invoiceRes.rows[0], items: itemsRes.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};


// Update Invoice (Only if unpaid)
const updateInvoice = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Check existing invoice
        const existingRes = await client.query('SELECT * FROM invoices WHERE id = $1', [id]);
        if (existingRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).send('Invoice not found');
        }
        const existingInvoice = existingRes.rows[0];

        if (existingInvoice.status === 'paid') {
            const invoiceDate = new Date(existingInvoice.created_at);
            const today = new Date();
            const isSameDay = invoiceDate.getDate() === today.getDate() &&
                invoiceDate.getMonth() === today.getMonth() &&
                invoiceDate.getFullYear() === today.getFullYear();

            if (!isSameDay) {
                await client.query('ROLLBACK');
                return res.status(403).send('لا يمكن تعديل الفواتير المدفوعة في أيام سابقة');
            }
        }
        // Note: Void invoices still cannot be edited
        else if (existingInvoice.status === 'void') {
            await client.query('ROLLBACK');
            return res.status(400).send('Cannot update a void invoice');
        }

        const { items, coupon_code } = req.body;
        // items = [{ service_id, service_name, unit_price, quantity }]

        // 2. Calculate New Total
        let total_amount = 0;
        items.forEach(item => {
            total_amount += Number(item.unit_price) * Number(item.quantity || 1);
        });

        // 3. Apply Coupon Logic (Re-evaluate)
        let discount_amount = 0;
        let coupon_id = null;

        if (coupon_code) {
            const couponRes = await client.query('SELECT * FROM coupons WHERE code = $1', [coupon_code]);
            if (couponRes.rows.length > 0) {
                const coupon = couponRes.rows[0];
                // Reuse validation logic roughly, but if it's the SAME coupon, ignore usage limit check
                // For simplified MVP: We just check general validity.
                // If user changes coupon, we might strictly check validty.
                if (coupon.is_active && (!coupon.expiry_date || new Date(coupon.expiry_date) >= new Date())) {
                    coupon_id = coupon.id;
                    if (coupon.discount_type === 'percentage') {
                        discount_amount = total_amount * (Number(coupon.value) / 100);
                    } else {
                        discount_amount = Number(coupon.value);
                    }

                    // Note: We are NOT adjusting used_count here for simplicity in this MVP update.
                    // Ideally we would decrement old coupon and increment new one if they changed.
                    // Given the request context, we assume minimal coupon swapping on edits.
                }
            }
        }

        const final_amount = Math.max(0, total_amount - discount_amount);

        // 4. Update Invoice Record
        await client.query(
            `UPDATE invoices 
             SET total_amount = $1, discount_amount = $2, final_amount = $3, coupon_id = $4, updated_at = NOW()
             WHERE id = $5`,
            [total_amount, discount_amount, final_amount, coupon_id, id]
        );

        // 5. Update Items (Delete all and Re-insert)
        await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);

        for (const item of items) {
            await client.query(
                `INSERT INTO invoice_items (invoice_id, service_id, service_name, unit_price, quantity, subtotal)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [id, item.service_id, item.service_name, item.unit_price, item.quantity || 1, Number(item.unit_price) * Number(item.quantity || 1)]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Invoice updated successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
};

// Void Invoice
const voidInvoice = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
        return res.status(400).send('Cancellation reason is required');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const invoiceRes = await client.query('SELECT * FROM invoices WHERE id = $1', [id]);
        if (invoiceRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).send('Invoice not found');
        }
        const invoice = invoiceRes.rows[0];

        if (invoice.status === 'void') {
            await client.query('ROLLBACK');
            return res.status(400).send('Invoice is already void');
        }

        // If invoice was paid, we might need to handle refund logic here or just mark as void.
        // For now, assuming voiding invalidates the payment too.

        await client.query(
            `UPDATE invoices 
             SET status = 'void', cancellation_reason = $1, updated_at = NOW() 
             WHERE id = $2`,
            [reason, id]
        );

        // If a coupon was used, we should ideally decrement the used_count
        if (invoice.coupon_id) {
            await client.query('UPDATE coupons SET used_count = GREATEST(0, used_count - 1) WHERE id = $1', [invoice.coupon_id]);
        }

        await client.query('COMMIT');
        res.json({ message: 'Invoice voided successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
};

module.exports = {
    createInvoice,
    getInvoices,
    settleInvoice,
    getInvoiceDetails,
    updateInvoice,
    voidInvoice
};
