const enableBankingService = require('../services/enableBankingService');
const transactionService = require('../services/transactionService');
const { saveTransactionsToFile, readTransactionsFromFile, mergeTransactions, updateTransactionInFile } = require('../utils/storage');

exports.updateTransaction = async (req, res) => {
  try {
    const { account_id, entry_reference } = req.params;
    const updates = req.body;

    const updated = updateTransactionInFile(account_id, entry_reference, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating transaction:', error.message);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
};

const CACHE_TTL = 60 * 1000; // 1 minute fresh cache window

function isCacheFresh(existingData) {
  if (!existingData?.updated_at) return false;

  const lastUpdate = new Date(existingData.updated_at).getTime();
  const diff = Date.now() - lastUpdate;
  console.log(`Cache age: ${Math.round(diff / 1000)}s`);
  return diff < CACHE_TTL;
}

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
    const { session_id, date_from: user_date_from, date_to: user_date_to } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // 1. Read existing data from cache
    const existingData = readTransactionsFromFile(account_id);

    // 2. Check if cache is still "fresh" (< 1 min)
    if (isCacheFresh(existingData)) {
      console.log('Returning fresh cache data...');
      return res.json(existingData);
    }

    // 3. Determine incremental starting point
    // If user provided a date_from, use it. Otherwise use the latest date from cache.
    let date_from = user_date_from || existingData?.latest_date || null;
    let date_to = user_date_to || null;

    console.log(`Fetching incremental data from: ${date_from || 'Beginning'}`);

    // 4. Fetch new data from API
    const newData = await transactionService.fetchTransactionsByAccount(
      session_id, 
      account_id, 
      date_from, 
      date_to
    );

    // 5. Check if we actually got anything new
    if (!newData || newData.length === 0) {
      console.log('No new transactions found. Returning existing cache.');
      return res.json(existingData || { account_id, transactions: [] });
    }

    // 6. Merge + Deduplicate
    const mergedTransactions = mergeTransactions(existingData, newData);

    // 7. Save to persistent storage
    saveTransactionsToFile(account_id, mergedTransactions);

    // 8. Return the full merged set
    const responseData = {
        account_id,
        latest_date: mergedTransactions[0]?.value_date || null,
        latest_transaction_ref: mergedTransactions[0]?.entry_reference || null,
        transactions: mergedTransactions,
        updated_at: new Date().toISOString()
    };

    res.json(responseData);

  } catch (error) {
    console.error('Error in getTransactions flow:', error.response?.data || error.message);
    res.status(500).json({ 
        error: 'Failed to fetch transactions', 
        details: error.response?.data || error.message 
    });
  }
};
