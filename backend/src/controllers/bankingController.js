const enableBankingService = require('../services/enableBankingService');
const transactionService = require('../services/transactionService');

exports.startAuth = async (req, res) => {
  try {
    const data = await enableBankingService.initiateAuth(req.body);
    res.json({
      url: data.url,
      id: data.id
    });
  } catch (error) {
    console.error('Error initiating auth:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to initiate authorization',
      details: error.response?.data || error.message
    });
  }
};

exports.createSession = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const sessionData = await enableBankingService.createSession(code);
    let accounts = sessionData.accounts;
    const sessionId = sessionData.session_id;

    if (!accounts || accounts.length === 0) {
      console.log('Accounts missing from session response, fetching explicitly...');
      accounts = await enableBankingService.fetchAccounts(sessionId);
    }

    res.json({
      session_id: sessionId,
      accounts: accounts || [],
      status: 'Session created successfully'
    });
  } catch (error) {
    console.error('Error creating session:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to create session',
      details: error.response?.data || error.message
    });
  }
};

exports.getAspsps = async (req, res) => {
  try {
    const { country = 'FI' } = req.query;
    const data = await enableBankingService.getAspsps(country);
    res.json(data);
  } catch (error) {
    console.error('Error fetching ASPSPs:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch ASPSPs',
      details: error.response?.data || error.message
    });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { account_id } = req.params;
    const { session_id, date_from, date_to } = req.query;
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const data = await transactionService.fetchTransactionsByAccount(session_id, account_id, date_from, date_to);
    res.json(data);
  } catch (error) {
    console.error('Error fetching transactions:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch transactions',
      details: error.response?.data || error.message
    });
  }
};
