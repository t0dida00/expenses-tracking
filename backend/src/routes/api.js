const express = require('express');
const router = express.Router();
const bankingController = require('../controllers/bankingController');

router.post('/auth', bankingController.startAuth);
router.post('/sessions', bankingController.createSession);
router.get('/aspsps', bankingController.getAspsps);
router.get('/accounts/:account_id/transactions', bankingController.getTransactions);

module.exports = router;
