const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

// Generate Coupon Code
const generateCode = (prefix = 'DISC') => {
    return `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

// Create a batch of coupons
const generateCoupons = async (req, res) => {
    try {
        const { prefix, discount_type, value, count, expiry_date, usage_limit } = req.body;

        const coupons = [];
        for (let i = 0; i < count; i++) {
            const code = generateCode(prefix);
            const newCoupon = await pool.query(
                `INSERT INTO coupons (code, discount_type, value, usage_limit, expiry_date) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [code, discount_type, value, usage_limit !== undefined ? usage_limit : 1, expiry_date]
            );
            coupons.push(newCoupon.rows[0]);
        }

        res.json({ message: `${count} coupons generated successfully`, coupons });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// List all coupons
const getCoupons = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Validate a coupon (for frontend check)
const validateCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const result = await pool.query('SELECT * FROM coupons WHERE code = $1', [code]);

        if (result.rows.length === 0) {
            return res.status(404).json({ valid: false, message: 'كوبون غير موجود' });
        }

        const coupon = result.rows[0];

        if (!coupon.is_active) {
            return res.status(400).json({ valid: false, message: 'هذا الكوبون غير نشط' });
        }

        if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
            return res.status(400).json({ valid: false, message: 'انتهت صلاحية هذا الكوبون' });
        }

        if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) {
            return res.status(400).json({ valid: false, message: 'تم استهلاك هذا الكوبون بالكامل' });
        }

        res.json({ valid: true, coupon });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Delete/Deactivate Coupon
const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM coupons WHERE id = $1', [id]);
        res.json({ message: 'Coupon deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    generateCoupons,
    getCoupons,
    validateCoupon,
    deleteCoupon
};
