const router = require('express').Router();
const patientController = require('../controllers/patientController');

router.get('/', patientController.getAllPatients);
router.post('/', patientController.createPatient);

module.exports = router;
