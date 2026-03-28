const axios = require('axios');
const { generateJWT } = require('../utils/auth');
const config = require('../config/env');


const getCommonHeaders = (token, extra = {}) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...extra
});

exports.initiateAuth = async ({ aspsp, psu_type, state }) => {
    const token = generateJWT();

    const authData = {
        aspsp: aspsp || { name: 'Nordea', country: 'FI' },
        psu_type: psu_type || 'personal',
        redirect_url: config.REDIRECT_URL,
        state: state || `state-${Math.random().toString(36).substring(7)}`,
        access: {
            valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            balances: true,
            transactions: true
        }
    };

    const response = await axios.post(`${config.API_URL}/auth`, authData, {
        headers: getCommonHeaders(token)
    });

    return response.data;
};

exports.createSession = async (code) => {
    const token = generateJWT();

    const response = await axios.post(`${config.API_URL}/sessions`, { code }, {
        headers: getCommonHeaders(token)
    });

    return response.data;
};

exports.fetchAccounts = async (sessionId) => {
    const token = generateJWT();

    const response = await axios.get(`${config.API_URL}/accounts`, {
        headers: getCommonHeaders(token, { 'session-id': sessionId })
    });

    return response.data.accounts || [];
};

exports.getAspsps = async (country = 'FI') => {
    const token = generateJWT();

    const response = await axios.get(`${config.API_URL}/aspsps`, {
        params: { country },
        headers: { 'Authorization': `Bearer ${token}` }
    });

    return response.data;
};
