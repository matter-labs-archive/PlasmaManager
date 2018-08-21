const config = require('./config');
var storage;
if (config.debug) {
	storage = require('./blockstorage/localBlockStorage');
} else {
	storage = require('./blockstorage/digitalOceanStorage');
}
const ethUtil = require("ethereumjs-util");
const rp = require("request-promise-native");
const Web3 = require("web3");
const assert = require("assert");

async function main() {
	try {
		let lastBlock = await storage.getLastUploadedBlockNumber();
		let lastHash = await getBlockHash(lastBlock);
		let newBlock = await assembleBlock(lastBlock + 1, lastHash);
		await storage.storeBlock(newBlock);
	}
	catch (err) {
		console.log(err);
	}
	// todo check block overflow while waiting
	setTimeout(main, config.interval);
}

main().catch(err => { console.log(err); process.exit(1); });

async function checkBlockOverflow(currentBlock) {
	const options = {
		uri: `http://${config.assemblerEndpoint}/crrentCounter`,
		json: true 
	};
	let result = await rp(options);
	return result.blockNumber > currentBlock; // todo maybe +1
}

async function assembleBlock(blockNumber, previousBlockHash) {
	const hashHex = ethUtil.bufferToHex(previousBlockHash);
	const options = {
		method: 'POST',
		uri: `http://${config.assemblerEndpoint}/assembleBlock`,
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

async function getBlockHash(blockNumber) {
	let header = Buffer.from('BankexFoundation', 'ascii');
	if (blockNumber > 0) {
		let block = await storage.getBlock(blockNumber);
		header = block.slice(0, config.blockHeaderLength);
	}
	const hash = ethUtil.hashPersonalMessage(header);
	assert(hash.length === 32);
	return hash;
}

