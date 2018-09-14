const fs = require("fs")
const config = require("./blockstorageConfig");

function getBlockDirectory() {
    if (config.localStorageDirName === null ||
        config.localStorageDirName === undefined || 
        config.localStorageDirName === "") {
            return __dirname + "/blocks/"
    }
    return config.localStorageDirName
}

var lastBlock = 0
async function getBlock(blockNumber) {
    if (typeof blockNumber.toString() === 'function') {
        blockNumber = blockNumber.toString(10);
    }
    const blockDirectory = getBlockDirectory()
    const blockBuffer = fs.readFileSync(blockDirectory + blockNumber)
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
    const blockDirectory = getBlockDirectory()
    fs.writeFileSync(blockDirectory + blockNumber, block);
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