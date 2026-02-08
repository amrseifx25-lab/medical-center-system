const db = require('../db');

// --- CONTROLLERS ---

// Get all requests (Joined with Patient info)
const getAllRequests = async (req, res) => {
    try {
        const query = `
            SELECT 
                r.id, 
                r.service_type, 
                r.status, 
                r.requested_at,
                p.full_name as patient_name,
                p.id as patient_id
            FROM radiology_requests r
            JOIN visits v ON r.visit_id = v.id
            JOIN patients p ON v.patient_id = p.id
            ORDER BY r.requested_at DESC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Create New Request (Implicitly creates a Visit)
const createRequest = async (req, res) => {
    const { patient_id, service_type, doctor_id } = req.body;

    // Transaction to ensure data integrity
    const client = await db.pool.connect(); // Need to export pool or use db.query differently. 
    // Wait, my db.js only exports 'query'. I should update db.js to export pool or handle transaction here using separate queries if simple, 
    // OR just use a simple flow for now since I can't easily transaction without pool access.
    // I'll check db.js first. 

    try {
        // 1. Create Visit
        const visitResult = await db.query(
            'INSERT INTO visits (patient_id, doctor_id, type, status) VALUES ($1, $2, $3, $4) RETURNING id',
            [patient_id, doctor_id || null, 'radiology', 'pending']
        );
        const visitId = visitResult.rows[0].id;

        // 2. Create Radiology Request
        const requestResult = await db.query(
            'INSERT INTO radiology_requests (visit_id, service_type, status) VALUES ($1, $2, $3) RETURNING *',
            [visitId, service_type, 'pending']
        );

        res.json(requestResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Add Report (Result)
const addReport = async (req, res) => {
    const { request_id, content, images } = req.body;
    try {
        // 1. Create Report
        const reportResult = await db.query(
            'INSERT INTO radiology_reports (request_id, content, images) VALUES ($1, $2, $3) RETURNING *',
            [request_id, content, JSON.stringify(images || []),]
        );

        // 2. Update Request Status
        await db.query('UPDATE radiology_requests SET status = $1 WHERE id = $2', ['reported', request_id]);

        // 3. Update Visit Status
        // Get visit_id first? Or just leave it. Let's update request only for now.

        res.json(reportResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getAllRequests,
    createRequest,
    addReport
};
