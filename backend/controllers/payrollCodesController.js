const db = require('../db');

// Get all codes
const getAllCodes = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT pc.*, a.name as gl_account_name, d.name as department_name 
            FROM payroll_codes pc
            LEFT JOIN accounts a ON pc.gl_account_id = a.id
            LEFT JOIN departments d ON pc.department_id = d.id
            ORDER BY pc.code ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Create code
const createCode = async (req, res) => {
    const { code, name, type, calculation_method, gl_account_id, department_id } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO payroll_codes (code, name, type, calculation_method, gl_account_id, department_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [code, name, type, calculation_method, gl_account_id || null, department_id || null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Update code
const updateCode = async (req, res) => {
    const { id } = req.params;
    const { code, name, type, calculation_method, gl_account_id, department_id } = req.body;
    try {
        const result = await db.query(
            'UPDATE payroll_codes SET code = $1, name = $2, type = $3, calculation_method = $4, gl_account_id = $5, department_id = $6 WHERE id = $7 RETURNING *',
            [code, name, type, calculation_method, gl_account_id || null, department_id || null, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Delete code
const deleteCode = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM payroll_codes WHERE id = $1', [id]);
        res.json({ message: 'Code deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getAllCodes,
    createCode,
    updateCode,
    deleteCode
};
