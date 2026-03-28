const jwt = require('jsonwebtoken');
const config = require('../config/env');

exports.generateJWT = () => {
    if (!config.PRIVATE_KEY) {
        throw new Error(`Private key missing. Please check your setup at ${config.PRIVATE_KEY_PATH}`);
    }

    const payload = {
        iss: config.APP_ID,
        aud: 'api.enablebanking.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600 // Valid for 1 hour
    };

    return jwt.sign(payload, config.PRIVATE_KEY, {
        algorithm: 'RS256',
        keyid: config.KEY_ID
    });
};
