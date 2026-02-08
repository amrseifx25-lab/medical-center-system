const { pool } = require('../db');

// Get Doctor's Queue
const getDoctorQueue = async (req, res) => {
    try {
        const doctorId = req.user.id; // User ID from token
        const query = `
            SELECT i.id as invoice_id, i.created_at, p.id as patient_id, p.full_name as patient_name, p.phone
            FROM invoices i
            JOIN patients p ON i.patient_id = p.id
            LEFT JOIN medical_reports mr ON i.id = mr.invoice_id
            WHERE i.doctor_id = $1 AND mr.id IS NULL AND i.status != 'void'
            ORDER BY i.created_at ASC
        `;
        const result = await pool.query(query, [doctorId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Get Patient Medical History (Reports, Radiology, Lab)
const getPatientHistory = async (req, res) => {
    try {
        const { patientId } = req.params;

        // 1. Fetch Medical Reports
        const reportsRes = await pool.query(`
            SELECT mr.*, u.full_name as doctor_name
            FROM medical_reports mr
            JOIN users u ON mr.doctor_id = u.id
            WHERE mr.patient_id = $1
            ORDER BY mr.created_at DESC
        `, [patientId]);

        // 2. Fetch Radiology Results
        const radiologyRes = await pool.query(`
            SELECT rr.*, v.visit_date
            FROM radiology_requests rr
            JOIN visits v ON rr.visit_id = v.id
            WHERE v.patient_id = $1 AND rr.status = 'reported'
            ORDER BY v.visit_date DESC
        `, [patientId]);

        // 3. Fetch Lab Results
        const labRes = await pool.query(`
            SELECT lr.*, v.visit_date
            FROM lab_requests lr
            JOIN visits v ON lr.visit_id = v.id
            WHERE v.patient_id = $1 AND lr.result_count > 0
            ORDER BY v.visit_date DESC
        `, [patientId]);

        res.json({
            medical_reports: reportsRes.rows,
            radiology: radiologyRes.rows,
            lab: labRes.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Save Medical Report
const saveMedicalReport = async (req, res) => {
    try {
        const { invoice_id, patient_id, complaint, diagnosis, treatment, notes } = req.body;
        const doctor_id = req.user.id;

        const query = `
            INSERT INTO medical_reports (invoice_id, patient_id, doctor_id, complaint, diagnosis, treatment, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `;
        const result = await pool.query(query, [invoice_id, patient_id, doctor_id, complaint, diagnosis, treatment, notes]);

        res.json({ message: 'Medical report saved successfully', report: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getDoctorQueue,
    getPatientHistory,
    saveMedicalReport
};
