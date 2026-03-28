require('dotenv').config();

const config = {
  APP_ID: process.env.ENABLEBANKING_APP_ID,
  API_URL: process.env.ENABLEBANKING_API_URL,
  REDIRECT_URL: process.env.FRONTEND_REDIRECT_URL,
  PRIVATE_KEY_PATH: process.env.ENABLEBANKING_PRIVATE_KEY_PATH || 'private-key.pem',
  PORT: process.env.PORT || 3000
};

module.exports = config;
