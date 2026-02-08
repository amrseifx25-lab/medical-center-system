const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/queue', verifyToken, doctorController.getDoctorQueue);
router.get('/history/:patientId', verifyToken, doctorController.getPatientHistory);
router.post('/report', verifyToken, doctorController.saveMedicalReport);

module.exports = router;
