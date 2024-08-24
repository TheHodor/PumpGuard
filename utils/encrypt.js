const crypto = require('crypto');
require('dotenv').config()


const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const ENCODING_TYPE = 'utf-8';
const DATA_FORMAT = 'hex';

if (!process.env.ENCRYPTION_KEY) 
    throw new Error('ENCRYPTION_KEY is missing from the environment variables');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
// Deterministic
const KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest('base64').substring(0, 32);

const encrypt = (data) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encryptedText = cipher.update(data, ENCODING_TYPE, DATA_FORMAT);
    encryptedText += cipher.final(DATA_FORMAT);
    return iv.toString(DATA_FORMAT) + encryptedText;
}

const decrypt = (encryptedData) => {
    const iv = Buffer.from(encryptedData.substring(0, IV_LENGTH * 2), DATA_FORMAT);
    const encryptedText = encryptedData.substring(IV_LENGTH * 2);
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decryptedText = decipher.update(encryptedText, DATA_FORMAT, ENCODING_TYPE);
    decryptedText += decipher.final(ENCODING_TYPE);
    return decryptedText;
}

module.exports = { encrypt, decrypt };