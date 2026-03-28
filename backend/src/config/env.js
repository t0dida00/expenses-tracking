const fs = require('fs');
const path = require('path');

require('dotenv').config();

const config = {
  APP_ID: process.env.ENABLEBANKING_APP_ID,
  API_URL: process.env.ENABLEBANKING_API_URL,
  REDIRECT_URL: process.env.FRONTEND_REDIRECT_URL,
  KEY_ID: process.env.ENABLEBANKING_KEY_ID || process.env.ENABLEBANKING_APP_ID,
  PRIVATE_KEY_PATH: process.env.ENABLEBANKING_PRIVATE_KEY_PATH || 'private-key.pem',
  PORT: process.env.PORT || 3000,
  PRIVATE_KEY: ''
};

try {
  const absolutePath = path.isAbsolute(config.PRIVATE_KEY_PATH) 
    ? config.PRIVATE_KEY_PATH 
    : path.join(process.cwd(), config.PRIVATE_KEY_PATH);
    
  if (fs.existsSync(absolutePath)) {
    config.PRIVATE_KEY = fs.readFileSync(absolutePath, 'utf8');
  } else {
    console.warn(`Warning: Private key file not found at ${absolutePath}`);
  }
} catch (err) {
  console.warn(`Error loading private key: ${err.message}`);
}

module.exports = config;
