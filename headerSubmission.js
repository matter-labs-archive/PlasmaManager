const config = require('./config');
var storage;
if (config.debug) {
	storage = require('./blockstorage/localBlockStorage');
} else {
	storage = require('./blockstorage/digitalOceanStorage');
}
const ethUtil = require('ethereumjs-util');
const Web3 = require('web3');
const BN = Web3.utils.BN;
const Block = require("./lib/Block/RLPblock");

const TruffleContract = require('truffle-contract');

const web3 = new Web3(config.ethNodeAddress);
web3.eth.accounts.wallet.add(config.blockSenderKey);
const PlasmaContractModel = TruffleContract(require("./contracts/build/contracts/PlasmaParent.json"));

const PlasmaContract = new web3.eth.Contract(PlasmaContractModel.abi, config.contractAddress, {from: config.fromAddress});

async function main() {
	try {
		// console.log(web3.eth.accounts.wallet);
		let lastUploadedBlock = await storage.getLastUploadedBlockNumber();
		let lastSubmittedBlock = await getLastSubmittedBlockNumber();
		console.log("Last uploaded Plasma block is " + lastUploadedBlock);
		console.log("Last uploaded header is for block " + lastSubmittedBlock);
		lastSubmittedBlock = Number.parseInt(lastSubmittedBlock)
		lastUploadedBlock = Number.parseInt(lastUploadedBlock)
		if (lastUploadedBlock > lastSubmittedBlock) {
			let buffer = Buffer.alloc(0);
			let gasEstimate = 0;
			const lashHashInBlockchain = await getLastSubmittedBlockHash();
			console.log("In Plasma last hash is " + lashHashInBlockchain);
			// try to assemble as large batch as possible withing the gas limit
			for (let i = lastSubmittedBlock + 1; i <= lastUploadedBlock; i++) {
			//for (let i = lastSubmittedBlock + 1; i <= lastSubmittedBlock + 1; i++) {
				let block = await storage.getBlock(i);
				const bl = new Block(block);
				console.log("Block number is " + bl.header.blockNumber.toString('hex'));
				console.log("Previous hash is " + bl.header.parentHash.toString('hex'));
				let newBuffer = Buffer.concat([buffer, block.slice(0, config.blockHeaderLength)]);
				console.log("Headers length = " + newBuffer.length);
				gasEstimate = await estimateGas(newBuffer);
				console.log("Estimated gas = " + gasEstimate);
				if (gasEstimate > config.gasLimit) {
					break;
				}
				buffer = newBuffer;
			}
			if (buffer.length == 0) {
				throw "Block " + (lastSubmittedBlock + 1) + " doesn't fit within gas limit " + config.gasLimit;
			}
			console.log("Total headers length = " + buffer.length);
			await submitBlocks(buffer, gasEstimate);
			console.log("submitted blocks from " + (lastSubmittedBlock + 1));
            setTimeout(main, 10); // submit the next block
			return;
		}
        setTimeout(main, config.interval);
	}
	catch (err) {
		console.log(err);
		setTimeout(main, config.interval);
	}
}
main().catch(err => { console.log(err); process.exit(1); });

async function submitBlocks(buffer, gas) {
	let result = await PlasmaContract.methods.submitBlockHeaders(ethUtil.bufferToHex(buffer)).send({gas: gas});
}

async function estimateGas(buffer) {
	let estimatedGas = await PlasmaContract.methods.submitBlockHeaders(ethUtil.bufferToHex(buffer)).estimateGas({gas: 7e6});
	return estimatedGas;
}

async function getLastSubmittedBlockNumber() {
	let lastBlock = await PlasmaContract.methods.lastBlockNumber().call();
	return lastBlock;
}

async function getLastSubmittedBlockHash() {
	let hash = await PlasmaContract.methods.hashOfLastSubmittedBlock().call();
	return hash;
}