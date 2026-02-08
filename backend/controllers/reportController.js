const pool = require('../db');

const getDashboardStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // 1. General Stats (Operational)
        const patientsCount = await pool.query('SELECT COUNT(*) FROM patients');
        const todayVisits = await pool.query("SELECT COUNT(*) FROM visits WHERE visit_date::date = $1", [today]);
        const labResults = await pool.query("SELECT COUNT(*) FROM lab_requests"); // Simplified
        const unpaidInvoices = await pool.query("SELECT COUNT(*) FROM invoices WHERE status = 'unpaid' AND created_at::date = $1", [today]);

        // 2. Financial Stats (Owner Only View)
        // Today
        const todayRevenue = await pool.query(
            "SELECT COALESCE(SUM(final_amount), 0) as total, COALESCE(SUM(discount_amount), 0) as discounts FROM invoices WHERE paid_at::date = $1 AND status = 'paid'",
            [today]
        );

        // MTD (Month to Date)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const mtdRevenue = await pool.query(
            "SELECT COALESCE(SUM(final_amount), 0) as total FROM invoices WHERE paid_at >= $1 AND status = 'paid'",
            [startOfMonth.toISOString()]
        );

        // YTD (Year to Date)
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        const ytdRevenue = await pool.query(
            "SELECT COALESCE(SUM(final_amount), 0) as total FROM invoices WHERE paid_at >= $1 AND status = 'paid'",
            [startOfYear.toISOString()]
        );

        res.json({
            operational: {
                total_patients: patientsCount.rows[0].count,
                today_visits: todayVisits.rows[0].count,
                lab_results: labResults.rows[0].count,
                unpaid_today: unpaidInvoices.rows[0].count
            },
            financial: {
                today: {
                    revenue: todayRevenue.rows[0].total,
                    discounts: todayRevenue.rows[0].discounts
                },
                mtd: mtdRevenue.rows[0].total,
                ytd: ytdRevenue.rows[0].total
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const closeDay = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Check if already closed
        const existing = await pool.query("SELECT * FROM daily_closings WHERE closing_date = $1", [today]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Day already closed!' });
        }

        // Calculate totals
        const stats = await pool.query(
            `SELECT 
                COALESCE(SUM(final_amount), 0) as revenue,
                COUNT(*) as count
             FROM invoices WHERE paid_at::date = $1 AND status = 'paid'`,
            [today]
        );

        const { revenue, count } = stats.rows[0];

        // Insert Closing Record
        await pool.query(
            "INSERT INTO daily_closings (closing_date, total_revenue, total_invoices_count) VALUES ($1, $2, $3)",
            [today, revenue, count]
        );

        res.json({ message: 'Day Closed Successfully', revenue, count });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const getCashReport = async (req, res) => {
    try {
        const { date } = req.query; // YYYY-MM-DD
        const cashier_id = req.user.id; // Specific to logged-in user

        // Parse Date Range for specific day
        const startDate = date ? `${date} 00:00:00` : new Date().toISOString().split('T')[0] + ' 00:00:00';
        const endDate = date ? `${date} 23:59:59` : new Date().toISOString().split('T')[0] + ' 23:59:59';

        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_invoices,
                COALESCE(SUM(final_amount), 0) as total_cash,
                payment_method
            FROM invoices
            WHERE cashier_id = $1 
            AND paid_at >= $2 AND paid_at <= $3
            AND status = 'paid'
            GROUP BY payment_method
        `, [cashier_id, startDate, endDate]);

        // Get Details
        const details = await pool.query(`
            SELECT id, final_amount, payment_method, paid_at, patient_id
            FROM invoices
            WHERE cashier_id = $1 
            AND paid_at >= $2 AND paid_at <= $3
            AND status = 'paid'
            ORDER BY paid_at DESC
        `, [cashier_id, startDate, endDate]);

        res.json({
            summary: result.rows,
            details: details.rows,
            date: date || new Date().toISOString().split('T')[0],
            cashier: req.user.username
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getDashboardStats,
    closeDay,
    getCashReport
};
