const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const APP_ID = process.env.ENABLEBANKING_APP_ID;
const API_URL = process.env.ENABLEBANKING_API_URL;
const REDIRECT_URL = process.env.FRONTEND_REDIRECT_URL;
const PRIVATE_KEY_PATH = process.env.ENABLEBANKING_PRIVATE_KEY_PATH || 'private-key.pem';

let PRIVATE_KEY = '';
try {
  PRIVATE_KEY = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
} catch (err) {
  console.warn(`Warning: Could not load private key from ${PRIVATE_KEY_PATH}: ${err.message}`);
}

// Function to generate a JWT for Enable Banking API authorization
function generateJWT() {
  const payload = {
    iss: APP_ID,
    aud: 'api.enablebanking.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 // Valid for 1 hour
  };

  return jwt.sign(payload, PRIVATE_KEY, {
    algorithm: 'RS256',
    keyid: process.env.ENABLEBANKING_KEY_ID || APP_ID
  });
}

exports.startAuth = async (req, res) => {
  try {
    const { aspsp, psu_type, state } = req.body;

    // Check if the private key was successfully loaded
    if (!PRIVATE_KEY) {
      return res.status(500).json({ error: `Please place your Enable Banking private key in the file: ${PRIVATE_KEY_PATH} as specified in your .env file.` });
    }

    const token = generateJWT();
    console.log('Generated token for /auth');

    // Default request body for auth initiation
    const authData = {
      aspsp: aspsp || {
        name: 'Nordea', // Sandbox default mock bank
        country: 'FI'
      },
      psu_type: psu_type || 'personal',
      redirect_url: REDIRECT_URL,
      state: state || `state-${Math.random().toString(36).substring(7)}`,
      access: {
        valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days access
        balances: true,
        transactions: true
      }
    };

    const response = await axios.post(`${API_URL}/auth`, authData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'psu-ip-address': '127.0.0.1',
        'psu-user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Send the redirect URL back to the frontend
    res.json({
      url: response.data.url,
      id: response.data.id
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

    const token = generateJWT();

    const response = await axios.post(`${API_URL}/sessions`, { code }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    let accounts = response.data.accounts;
    const sessionId = response.data.session_id;

    // If accounts didn't come in the session response (common for some banks), fetch them explicitly
    if (!accounts || accounts.length === 0) {
      console.log('Accounts missing from session response, fetching explicitly...');
      try {
        const accountsResponse = await axios.get(`${API_URL}/accounts`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'session-id': sessionId
          }
        });
        accounts = accountsResponse.data.accounts || [];
      } catch (accErr) {
        console.warn('Failed to fetch accounts list separately:', accErr.response?.data || accErr.message);
      }
    }

    console.log('Session response:', { sessionId, accountCount: accounts?.length });

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
    const token = generateJWT();

    const response = await axios.get(`${API_URL}/aspsps`, {
      params: { country },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    res.json(response.data);
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
    const { session_id } = req.query;
    console.log('Session ID:', session_id);
    console.log('Account ID:', account_id);
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const token = generateJWT();

    const response = await axios.get(`${API_URL}/accounts/${account_id}/transactions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'session-id': session_id
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching transactions:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch transactions',
      details: error.response?.data || error.message
    });
  }
};
