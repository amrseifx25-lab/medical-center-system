const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'your_super_secret_key_change_this';

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.status(401).json({ message: 'Access Denied: No Token Provided' });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ message: 'Invalid Token' });
    }
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access Denied: Insufficient Permissions' });
        }
        next();
    };
};

module.exports = { verifyToken, requireRole };
