const rp = require("request-promise-native");

/**
 * Sending transaction method.
 * @param {string} tx A string of a plasma transaction hash, processed by inner transaction building methods
 * @param {string} endpoint An endpoint of the 'POST' method. There are 2 possible endpoints:
 *                          1) "plasma.thematter.io/api/v1" - mainnet endpoint
 *                          2) "plasma-testnet.thematter.io/api/v1" - rinkeby testnet
 * @returns {json} JSON object, that consists of 2 keys:
 *                 1) "error": "false", if no errors were popped. Otherwise has several types of errors:
 *                 Respond status error, insufficient amount, invalid address error.
 *                 2) "accepted": "true", if transaction was processed without errors.
 */
async function sendTransaction(tx, endpoint) {
    const options = {
        method: 'POST',
        uri: `http://${endpoint}/sendRawTX`,
        body: {tx: tx},
        json: true 
    };
    const result = await rp(options);
    return result
}

module.exports = {sendTransaction}
