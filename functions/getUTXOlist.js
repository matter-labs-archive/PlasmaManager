const rp = require("request-promise-native");

/**
 * Getting list of available UTXOs for the ethereum address
 * @param {string} address Ethereum address from which UTXOs are collected
 * @param {string} listerEndpoint Request endpoint. There are 2 possible endpoints:
 *                                1) plasma.thematter.io/api/v1 - mainnet endpoint
 *                                2) plasma-testnet.thematter.io/api/v1 - rinkeby testnet
 * @returns {json} JSON object, that consists of 2 keys:
 *                 1) "error": "false", if no errors were popped. Otherwise has several types of errors:
 *                 Error loading transactions, JSON decode error, Request error.
 *                 2) "utxos": a list of UTXOs
 * 
 * UTXO structure:
 * @param {number} blockNumber A block that has available UTXO
 * @param {number} transactionNumber A number of a transaction that has returned UTXO
 * @param {number} outputNumber A number of an output in the transacation
 * @param {string} value A string type of the output value
 */
async function getUTXOlist(address, listerEndpoint) {
    const options = {
        method: 'POST',
        uri: `http://${listerEndpoint}/listUTXOs`,
        body: {for: address,
            blockNumber: 1,
            transactionNumber: 0,
            outputNumber: 0
        },
        json: true 
    };
    const result = await rp(options);
    return result
}

module.exports = {getUTXOlist}
