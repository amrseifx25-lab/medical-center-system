const router = require('express').Router();
const labController = require('../controllers/labController');

router.get('/', labController.getAllRequests);
router.post('/', labController.createRequest);
router.post('/result', labController.addResult);
router.get('/:id/results', labController.getRequestResults);
router.get('/:id', labController.getRequest); // Get request details (incl text)
router.put('/:id/report', labController.updateReport); // Update report text

module.exports = router;
