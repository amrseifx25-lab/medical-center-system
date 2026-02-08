const db = require('../db');

// Get all patients
const getAllPatients = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM patients ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Create new patient
const createPatient = async (req, res) => {
    const { full_name, national_id, phone, gender, dob, address } = req.body;
    try {
        // Ensure national_id is null if empty/undefined to avoid Unique Constraint violation on empty strings
        const safeNationalId = national_id && national_id.trim() !== '' ? national_id : null;

        const result = await db.query(
            'INSERT INTO patients (full_name, national_id, phone, gender, dob, address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [full_name, safeNationalId, phone, gender, dob, address]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getAllPatients,
    createPatient
};
