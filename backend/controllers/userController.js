const db = require('../db');
const bcrypt = require('bcryptjs');

// Get All Users
const getUsers = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.id, u.username, u.full_name, r.name as role
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.id
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Create User
const createUser = async (req, res) => {
    const { username, password, full_name, role } = req.body;
    try {
        const roleRes = await db.query('SELECT id FROM roles WHERE name = $1', [role]);
        if (roleRes.rows.length === 0) return res.status(400).json({ message: 'Invalid Role' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.query(`
            INSERT INTO users (username, password_hash, full_name, role_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, full_name
        `, [username, hashedPassword, full_name, roleRes.rows[0].id]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Delete User
const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get Roles
const getRoles = async (req, res) => {
    try {
        const result = await db.query('SELECT name FROM roles ORDER BY name');
        res.json(result.rows.map(r => r.name));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getUsers, createUser, deleteUser, getRoles };
