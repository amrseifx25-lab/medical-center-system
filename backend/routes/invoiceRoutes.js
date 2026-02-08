const router = require('express').Router();
const invoiceController = require('../controllers/invoiceController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken); // Protect all invoice routes

router.post('/', invoiceController.createInvoice);
router.get('/', invoiceController.getInvoices); // ?status=unpaid
router.put('/:id/settle', invoiceController.settleInvoice);
router.put('/:id/void', invoiceController.voidInvoice);
router.put('/:id', invoiceController.updateInvoice);
router.get('/:id', invoiceController.getInvoiceDetails);

module.exports = router;
