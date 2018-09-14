const config = require('./config');
var storage;
if (config.debug) {
	storage = require('./blockstorage/localBlockStorage');
} else {
	storage = require('./blockstorage/digitalOceanStorage');
}
const {getBlockHash} = require("./functions/getBlockHash");
const {assembleBlock} = require("./functions/assembleBlock");
const assemblerEndpoint = config.assemblerEndpoint;
const assemblyInterval = config.blockAssemblyInterval;

async function main() {
	try {
		let lastBlock = await storage.getLastUploadedBlockNumber();
		let lastHash = await getBlockHash(lastBlock, storage, config.blockHeaderLength);
		let newBlock = await assembleBlock(lastBlock + 1, lastHash, assemblerEndpoint);
		await storage.storeBlock(newBlock);
	}
	catch (err) {
		// setTimeout(main, 1000)
		// return
		console.log(err);
	}
	// TODO may be check for block overflow while waiting
	setTimeout(main, assemblyInterval);
}

main().catch(err => { console.log(err); process.exit(1); });

// async function checkBlockOverflow(currentBlock) {
// 	const options = {
// 		uri: `http://${config.assemblerEndpoint}/currentCounter`,
// 		json: true 
// 	};
// 	let result = await rp(options);
// 	return result.blockNumber > currentBlock; // todo maybe +1
// }

