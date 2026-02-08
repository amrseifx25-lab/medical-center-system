const router = require('express').Router();
const serviceController = require('../controllers/serviceController');

router.get('/', serviceController.getServices);
router.post('/', serviceController.addService);
router.put('/:id', serviceController.updateService);

module.exports = router;
