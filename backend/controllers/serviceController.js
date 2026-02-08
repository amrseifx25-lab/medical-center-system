const pool = require('../db');

// Get all services
const getServices = async (req, res) => {
    try {
        const { active } = req.query;
        let query = 'SELECT * FROM services';
        const params = [];

        if (active === 'true') {
            query += ' WHERE is_active = true';
        }

        query += ' ORDER BY name ASC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Add a new service
const addService = async (req, res) => {
    try {
        const { name, price, category, is_active } = req.body;
        const newService = await pool.query(
            'INSERT INTO services (name, price, category, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, price, category, is_active !== undefined ? is_active : true]
        );
        res.json(newService.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Update service (price, active status)
const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, category, is_active } = req.body;

        const updatedService = await pool.query(
            'UPDATE services SET name = $1, price = $2, category = $3, is_active = $4 WHERE id = $5 RETURNING *',
            [name, price, category, is_active, id]
        );

        if (updatedService.rows.length === 0) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.json(updatedService.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getServices,
    addService,
    updateService
};
