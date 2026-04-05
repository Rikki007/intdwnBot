const crypto = require('crypto');

/**
 * Generate hash for content deduplication
 */
function generateHash(content) {
    return crypto
        .createHash('md5')
        .update(content || '')
        .digest('hex');
}

/**
 * Generate unique ID
 */
function generateId() {
    return crypto.randomUUID();
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
    generateHash,
    generateId,
    sleep,
};
