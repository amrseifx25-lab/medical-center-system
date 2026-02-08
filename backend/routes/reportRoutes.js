const router = require('express').Router();
const reportController = require('../controllers/reportController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/dashboard', reportController.getDashboardStats);
router.get('/cash-report', reportController.getCashReport);
router.post('/close-day', reportController.closeDay);

module.exports = router;
