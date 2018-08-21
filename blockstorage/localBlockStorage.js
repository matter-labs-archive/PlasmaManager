const fs = require("fs")
var lastBlock = 0
async function getBlock(blockNumber) {
    if (typeof blockNumber.toString() === 'function') {
        blockNumber = blockNumber.toString(10);
    }
    const blockBuffer = fs.readFileSync(__dirname + "/blocks/"+blockNumber)
    return blockBuffer
}

async function getManifest() {
    let manifest = {lastBlock: lastBlock};
    return manifest;
}

async function storeBlock(block) {
    let manifest = await getManifest();
    let blockNumber = block.readUInt32BE(0);
    if (blockNumber != manifest.lastBlock + 1) {
        throw "Block " + blockNumber + " is out of sequence. Last block is " + manifest.lastBlock;
    }
    lastBlock++;
    fs.writeFileSync(__dirname + "/blocks/"+blockNumber, block);
    console.log("uploaded block " + blockNumber);
}

module.exports = {
	getLastUploadedBlockNumber: async function() {
		let manifest = await getManifest();
		return manifest.lastBlock;
	},
	getBlock: async function(blockNumber) {
        let bl = await getBlock(blockNumber)
        return bl
	},
	storeBlock: async function (blockData) {
        await storeBlock(blockData)
	},
};