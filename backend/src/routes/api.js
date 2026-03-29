const express = require('express');
const router = express.Router();
const bankingController = require('../controllers/bankingController');

router.use((req, res, next) => {
    console.log(`[API Router Debug] ${req.method} ${req.url}`);
    next();
});

router.post('/auth', bankingController.startAuth);
router.post('/sessions', bankingController.createSession);
router.get('/aspsps', bankingController.getAspsps);
router.get('/accounts/:account_id/transactions', bankingController.getTransactions);
router.patch('/accounts/:account_id/transactions/:entry_reference', bankingController.updateTransaction);

// Debug helper
router.use((req, res, next) => {
    console.log(`Unmatched API Request: ${req.method} ${req.url}`);
    next();
});

module.exports = router;
