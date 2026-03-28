const axios = require('axios');
const { generateJWT } = require('../utils/auth');
const config = require('../config/env');
const { extractTransactions } = require('../utils/extractor');
const aiService = require('./aiService');

exports.fetchTransactionsByAccount = async (session_id, account_id, date_from, date_to) => {
  const token = generateJWT();
  const params = {};
  if (date_from) params.date_from = date_from;
  if (date_to) params.date_to = date_to;
  const response = await axios.get(`${config.API_URL}/accounts/${account_id}/transactions`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'session-id': session_id
    },
    params
  });
  const transactions = extractTransactions(response.data);
  const analyzedTransactions = await Promise.all(
    transactions.map(tx => aiService.analyzeTransaction(tx))
  );
  return analyzedTransactions;
};
