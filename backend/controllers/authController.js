const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_super_secret_key_change_this';

// Login
const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query(`
            SELECT u.*, r.name as role_name 
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.username = $1
        `, [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate Token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role_name },
            SECRET_KEY,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role_name
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get Current User (Me)
const getMe = async (req, res) => {
    try {
        // req.user is set by authMiddleware
        const result = await db.query(`
            SELECT u.id, u.username, u.full_name, r.name as role
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = $1
        `, [req.user.id]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { login, getMe };
