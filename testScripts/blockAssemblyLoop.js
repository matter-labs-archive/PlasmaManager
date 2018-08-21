const config = require('../config');
const ethUtil = require('ethereumjs-util');
const Web3 = require('web3');
const BN = Web3.utils.BN;
const TruffleContract = require('truffle-contract');
const web3 = new Web3(config.ethNodeAddress);
const PlasmaContractModel = TruffleContract(require("../contracts/build/contracts/PlasmaParent.json"));
const Block = require('../lib/Block/RLPblock');
const {allAccounts, allPrivateKeys} = require("./accounts");
const rp = require("request-promise-native");
// const axios = require('axios')
const operatorAddress = allAccounts[0]
const userAddress = allAccounts[1]
const PlasmaContract = new web3.eth.Contract(PlasmaContractModel.abi, config.contractAddress, {from: operatorAddress, gas: 3000000});
const fs = require("fs");

async function main() {
	try {
        let lastSubmittedBlock = await getLastSubmittedBlockNumber();
        lastSubmittedBlock = Number(lastSubmittedBlock);
        const blockHash = await PlasmaContract.methods.hashOfLastSubmittedBlock().call();
        const isOperator = await PlasmaContract.methods.operators("0x3075b2a7ca23f21a80a55d6db3968203e91cf615").call();
        const fullBlock = await assembleBlock(lastSubmittedBlock + 1, blockHash, true)
        const BL = new Block(fullBlock);
        const block = fullBlock.slice(0, config.blockHeaderLength);
        const res = await writeBlock(fullBlock);
        if (!res) {
            setTimeout(main, 10); // submit the next block
            return 
        }
        const submissionGas = await estimateGas(block)
        const submissionResult = await submitBlocks(block)
        console.log("submitted block " + (lastSubmittedBlock + 1));
        fs.writeFileSync(__dirname + "/blocks/"+(lastSubmittedBlock + 1), fullBlock);
        setTimeout(main, 10); // submit the next block
        return 
	}
	catch (err) {
		// console.log(err);
    }
    setTimeout(main, 10);
}
main();

async function submitBlocks(buffer) {
    let result = await PlasmaContract.methods.submitBlockHeaders(ethUtil.bufferToHex(buffer)).send();
    return result;
}

async function estimateGas(buffer) {
	let estimatedGas = await PlasmaContract.methods.submitBlockHeaders(ethUtil.bufferToHex(buffer)).estimateGas();
	return estimatedGas;
}

async function getLastSubmittedBlockNumber() {
	let lastBlock = await PlasmaContract.methods.lastBlockNumber().call();
	return lastBlock;
}

async function assembleBlock(blockNumber, previousBlockHash) {
	let blockData = await axios.post(`http://${config.assemblerEndpoint}/assembleBlock`,
		{blockNumber: blockNumber, previousBlockHash: previousBlockHash, startNext: true});
	if (blockData.data.error == true) {
		throw new Error(JSON.stringify(blockData.data));
	}
	return Buffer.from(blockData.data.serializedBlock.replace('0x', ''), "hex");
}

async function writeBlock(block) {
	let writeResult = await axios.post(`http://${config.assemblerEndpoint}/writeBlock`,
        { block: ethUtil.bufferToHex(block)});
    return !writeResult.data.error
}



/*

let model = TruffleContract(require("./build/contracts/SimpleStorage.json"));
let c = new web3.eth.Contract(model.abi, model.networks[4447].address, {from: config.fromAddress});

 */