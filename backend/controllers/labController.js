const db = require('../db');

// --- CONTROLLERS ---

// Get all Lab Requests (Joined with Patient)
const getAllRequests = async (req, res) => {
    try {
        const query = `
            SELECT 
                l.id, 
                l.test_type, 
                v.visit_date as requested_at,
                p.full_name as patient_name,
                p.id as patient_id,
                (SELECT COUNT(*) FROM lab_results WHERE request_id = l.id) as result_count
            FROM lab_requests l
            JOIN visits v ON l.visit_id = v.id
            JOIN patients p ON v.patient_id = p.id
            ORDER BY v.visit_date DESC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Create Lab Request
const createRequest = async (req, res) => {
    const { patient_id, test_type, doctor_id } = req.body;
    try {
        // 1. Create Visit
        const visitResult = await db.query(
            'INSERT INTO visits (patient_id, doctor_id, type, status) VALUES ($1, $2, $3, $4) RETURNING id',
            [patient_id, doctor_id || null, 'lab', 'pending']
        );
        const visitId = visitResult.rows[0].id;

        // 2. Create Lab Request
        const requestResult = await db.query(
            'INSERT INTO lab_requests (visit_id, test_type) VALUES ($1, $2) RETURNING *',
            [visitId, test_type]
        );

        res.json(requestResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Add Lab Result
const addResult = async (req, res) => {
    const { request_id, parameter_name, value, unit, reference_range, is_abnormal } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO lab_results (request_id, parameter_name, value, unit, reference_range, is_abnormal) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [request_id, parameter_name, value, unit, reference_range, is_abnormal || false]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Get Results for a Request
const getRequestResults = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT * FROM lab_results WHERE request_id = $1', [id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Get Single Request details (including report)
const getRequest = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `SELECT l.*, p.full_name as patient_name 
             FROM lab_requests l
             JOIN visits v ON l.visit_id = v.id
             JOIN patients p ON v.patient_id = p.id
             WHERE l.id = $1`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Request not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Update Lab Report Text
const updateReport = async (req, res) => {
    const { id } = req.params;
    const { result_text } = req.body;
    try {
        const result = await db.query(
            'UPDATE lab_requests SET result_text = $1 WHERE id = $2 RETURNING *',
            [result_text, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getAllRequests,
    createRequest,
    addResult,
    getRequestResults,
    getRequest,
    updateReport
};
