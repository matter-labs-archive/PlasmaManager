const ethUtil = require("ethereumjs-util");
const rp = require("request-promise-native");

async function assembleBlock(blockNumber, previousBlockHash, assemblerEndpoint) {
    const hashHex = ethUtil.bufferToHex(previousBlockHash);
    if (blockNumber.toString !== undefined) {
        blockNumber = blockNumber.toString(10)
    }
    const options = {
        method: 'POST',
        uri: `http://${assemblerEndpoint}/assembleBlock`,
        body: {
            blockNumber: blockNumber, 
            previousBlockHash: hashHex, 
            startNext: true
        },
        timeout: 300*1000,
        json: true 
    };
    let blockData = await rp(options);
    if (blockData.error == true) {
        throw new Error(JSON.stringify(blockData));
    }
    return Buffer.from(blockData.serializedBlock.replace('0x', ''), "hex");
}

module.exports = {assembleBlock}


