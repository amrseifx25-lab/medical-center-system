const router = require('express').Router();
const accountingController = require('../controllers/accountingController');

router.get('/accounts', accountingController.getChartOfAccounts);
router.post('/accounts', accountingController.createAccount);
router.delete('/accounts/:id', accountingController.deleteAccount); // New
router.post('/journal', accountingController.createJournalEntry);
// Reports
router.get('/reports/trial-balance', accountingController.getTrialBalance);
router.get('/reports/profit-loss', accountingController.getProfitLoss);
router.get('/reports/aging', accountingController.getSupplierAging); // New
router.get('/reports/balance-sheet', accountingController.getBalanceSheet); // New

router.get('/expenses', accountingController.getExpenses);
router.post('/expenses', accountingController.createExpense);

// Phase 6: Dynamic Data & Revision
router.get('/departments', accountingController.getDepartments);
router.post('/departments', accountingController.createDepartment);
router.delete('/departments/:id', accountingController.deleteDepartment);

// Suppliers
router.get('/suppliers', accountingController.getSuppliers);
router.post('/suppliers', accountingController.createSupplier);

// Categories (Legacy but kept for now)
router.get('/categories', accountingController.getCategories);
router.post('/categories', accountingController.createCategory);
router.delete('/categories/:id', accountingController.deleteCategory);


router.get('/journal/entries', accountingController.getJournalEntries); // New
router.put('/journal/:id/revise', accountingController.reviseJournalEntry);

router.get('/reports/account-statement', accountingController.getAccountStatement);
router.get('/close-month-preview', accountingController.closeMonthPreview);
router.post('/close-month', accountingController.closeMonth);

module.exports = router;
