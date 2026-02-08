const router = require('express').Router();
const hrController = require('../controllers/hrController');
const payrollCodesController = require('../controllers/payrollCodesController');

router.get('/employees', hrController.getAllEmployees);
router.post('/employees', hrController.createEmployee);
router.put('/employees/:id', hrController.updateEmployee);
router.get('/departments', hrController.getDepartments);
router.post('/payroll/generate', hrController.generateSalarySlip);

router.post('/payroll/period', hrController.createPayrollPeriod);
router.get('/payroll/period', hrController.getPayrollPeriod);
router.post('/attendance', hrController.updateAttendance);
router.get('/attendance', hrController.getAttendance);
router.post('/payroll/calculate', hrController.calculatePayroll);
router.get('/payroll/sheet', hrController.getPayrollSheet);
router.put('/payroll/slip/:id', hrController.updateSalarySlip);
router.post('/payroll/close', hrController.closePayrollPeriod);

// Payroll Codes
router.get('/payroll-codes', payrollCodesController.getAllCodes);
router.post('/payroll-codes', payrollCodesController.createCode);
router.put('/payroll-codes/:id', payrollCodesController.updateCode);
router.delete('/payroll-codes/:id', payrollCodesController.deleteCode);

module.exports = router;
