const ethUtil = require("ethereumjs-util");
const assert = require("assert");

async function getBlockHash(blockNumber, storage, blockHeaderLength) {
    let header = Buffer.from('Matter', 'ascii');
    if (blockNumber > 0) {
        let block = await storage.getBlock(blockNumber);
        header = block.slice(0, blockHeaderLength);
    }
    const hash = ethUtil.hashPersonalMessage(header);
    assert(hash.length === 32);
    return hash;
}

module.exports = {getBlockHash}