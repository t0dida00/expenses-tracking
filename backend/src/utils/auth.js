const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

let cachedKey = null;

const getPrivateKey = () => {
    if (cachedKey) return cachedKey;

    const absolutePath = path.isAbsolute(config.PRIVATE_KEY_PATH)
        ? config.PRIVATE_KEY_PATH
        : path.join(process.cwd(), config.PRIVATE_KEY_PATH);

    if (fs.existsSync(absolutePath)) {
        cachedKey = fs.readFileSync(absolutePath, 'utf8');
        return cachedKey;
    } else {
        throw new Error(`Private key file not found at ${absolutePath}`);
    }
};

exports.generateJWT = () => {
    const privateKey = getPrivateKey();

    const payload = {
        iss: config.APP_ID,
        aud: 'api.enablebanking.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600 // Valid for 1 hour
    };

    return jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        keyid: config.APP_ID // Using APP_ID as the KID
    });
};
