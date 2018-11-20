const rp = require("request-promise-native");

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