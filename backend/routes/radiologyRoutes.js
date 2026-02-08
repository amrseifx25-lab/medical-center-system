const router = require('express').Router();
const radiologyController = require('../controllers/radiologyController');

router.get('/', radiologyController.getAllRequests);
router.post('/', radiologyController.createRequest);
router.post('/report', radiologyController.addReport);

module.exports = router;
