const router = require('express').Router();
const couponController = require('../controllers/couponController');

router.post('/generate', couponController.generateCoupons);
router.get('/', couponController.getCoupons);
router.post('/validate', couponController.validateCoupon);
router.delete('/:id', couponController.deleteCoupon);

module.exports = router;
