const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const { pool } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method === 'POST') console.log('Body:', JSON.stringify(req.body));
    next();
});

// Routes
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/hr', require('./routes/hrRoutes'));
app.use('/api/radiology', require('./routes/radiologyRoutes'));
app.use('/api/lab', require('./routes/labRoutes'));
app.use('/api/accounting', require('./routes/accountingRoutes'));
app.use('/api/doctor', require('./routes/doctorRoutes'));

// Phase 2: Financial Management
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const serviceRoutes = require('./routes/serviceRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

app.get('/', (req, res) => {
    res.send('Medical Center API is running...');
});

// Start Server
// Start Server

app.listen(PORT, async () => {
    try {
        await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;`);
        await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id);`);
        await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES users(id);`);
        console.log('Database migration checked/applied');
    } catch (err) {
        console.error('Migration error:', err);
    }
    console.log(`Server running on port ${PORT}`);
});
