const config = require('./config');
var storage;
if (config.debug) {
	storage = require('./blockstorage/localBlockStorage');
} else {
	storage = require('./blockstorage/digitalOceanStorage');
}
const ethUtil = require('ethereumjs-util');
const rp = require("request-promise-native");
const Web3 = require('web3');
const assert = require("assert");
const zlib = require('zlib');
const util = require('util');
const BN = Web3.utils.BN;

async function main() {
	try {
		let lastUploadedBlock = await storage.getLastUploadedBlockNumber();
		let lastWrittenBlock = await getLastWrittenBlock();
		console.log("Last uploaded Plasma block is " + lastUploadedBlock);
		console.log("Last written Plasma block is " + lastWrittenBlock);
		lastUploadedBlock = Number.parseInt(lastUploadedBlock)
		lastWrittenBlock = Number.parseInt(lastWrittenBlock)
		if (lastUploadedBlock > lastWrittenBlock) {
            const block = await storage.getBlock(lastWrittenBlock+1);
            assert(await writeBlock(block), "Failed to write a block");
			console.log("Written block " + (lastWrittenBlock + 1));
			setTimeout(main, 10); // submit the next block
		} else {
			setTimeout(main, config.blockWritingInterval);
		}
	}
	catch (err) {
		console.log(err);
		setTimeout(main, config.blockWritingInterval);
	}
}

async function getLastWrittenBlock() {
	const options = {
		uri: `http://${config.writerEndpoint}/lastWrittenBlock`,
		json: true 
	};
	let result = await rp(options);
    if (result.error == true) {
        throw new Error(JSON.stringify(result));
    }
    return result.blockNumber;
}

async function writeBlock(block) {
	if (block === undefined || block === null || block.length === undefined || block.length === 0) {
		console.log("Block is empty");
		return false;
	}
	try {
		console.log("Block size = " + block.length + " bytes");
		const options = {
			method: 'POST',
			uri: `http://${config.writerEndpoint}/writeBlock`,
			body: block, // Buffer !
            headers: {
                'content-type': "application/octet-stream"
            },
			timeout: 300*1000,
			json: true 
		};
		let writeResult = await rp(options);
		if (writeResult.error == true) {
			if (writeResult.description == "duplicate") {
				console.log("Duplicate write");
				return true;
			}
			// throw new Error(JSON.stringify(writeResult));
		}
		return false
	} catch(e) {
		return false
	}
}
main().catch(err => { console.log(err); process.exit(1); });