const axios = require('axios');
const { generateJWT } = require('../utils/auth');
const config = require('../config/env');
const { extractTransactions } = require('../utils/extractor');

exports.fetchTransactionsByAccount = async (session_id, account_id) => {
    const token = generateJWT();

    const response = await axios.get(`${config.API_URL}/accounts/${account_id}/transactions`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'session-id': session_id
        }
    });

    return extractTransactions(response.data);
};
