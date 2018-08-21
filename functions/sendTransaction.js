const rp = require("request-promise-native");

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