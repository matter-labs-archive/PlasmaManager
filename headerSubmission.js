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
const {Block} = require("./lib/Block/RLPblock");
const interval = config.blockAssemblyInterval;

async function main() {
    const contractDetails = await config.contractDetails();
    console.log("Connecting to the node " + config.ethNodeAddress)
    const web3 = new Web3(config.ethNodeAddress);
    const PlasmaContract = new web3.eth.Contract(contractDetails.abi, contractDetails.address);
    const importedWallet = web3.eth.accounts.wallet.add(config.blockSenderKey);
    console.log("Imported account " + importedWallet.address);
    const importedAddress = importedWallet.address;
    setTimeout(submitHeader, 1000)

    async function submitHeader() {
        try{ 
            console.log("Trying to submit headers")
            const allAccounts = await web3.eth.getAccounts();
            console.log("Available accounts " + JSON.stringify(allAccounts));
            let from = allAccounts[0];
            if (from === undefined || from === "") {
                from = importedAddress
            }
            let lastUploadedBlock = await storage.getLastUploadedBlockNumber();
            let lastSubmittedBlock = await getLastSubmittedBlockNumber(PlasmaContract);
            console.log("Last uploaded Plasma block is " + lastUploadedBlock);
            console.log("Last commited header is for block " + lastSubmittedBlock);
            lastSubmittedBlock = Number.parseInt(lastSubmittedBlock)
            lastUploadedBlock = Number.parseInt(lastUploadedBlock)
            if (lastUploadedBlock > lastSubmittedBlock) {
                let buffer = Buffer.alloc(0);
                let gasEstimate = 0;
                const lashHashInBlockchain = await getLastSubmittedBlockHash(PlasmaContract);
                console.log("In Plasma last hash is " + lashHashInBlockchain);
                // try to assemble as large batch as possible withing the gas limit
                for (let i = lastSubmittedBlock + 1; i <= lastUploadedBlock; i++) {
                    //for (let i = lastSubmittedBlock + 1; i <= lastSubmittedBlock + 1; i++) {
                    let block = await storage.getBlock(i);
                    // const bl = new Block(block);
                    // console.log("Block signed by " + ethUtil.bufferToHex(bl.getSenderAddress()));
                    // console.log("Block number is " + bl.header.blockNumber.toString('hex'));
                    // console.log("Previous hash is " + bl.header.parentHash.toString('hex'));
                    let newBuffer = Buffer.concat([buffer, block.slice(0, config.blockHeaderLength)]);
                    console.log("Headers length = " + newBuffer.length);
                    gasEstimate = await estimateGas(PlasmaContract, newBuffer, from);
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
                gasEstimate = Math.floor(gasEstimate * 15 / 10)
                await submitBlocks(PlasmaContract, buffer, gasEstimate, from);
                console.log("submitted blocks from " + (lastSubmittedBlock + 1));
                setTimeout(submitHeader, 1000); // submit the next block
                return;
            }
            setTimeout(submitHeader, interval);
        }
        catch (err) {
            console.log(err);
            setTimeout(submitHeader, 1000);
        }
    }
		
}
main().catch(err => { console.log(err); process.exit(1); });

async function submitBlocks(PlasmaContract, buffer, gas, from) {
    let result = await PlasmaContract.methods.submitBlockHeaders(ethUtil.bufferToHex(buffer)).send({gas: gas, from: from});
}

async function estimateGas(PlasmaContract, buffer, from) {
    let estimatedGas = await PlasmaContract.methods.submitBlockHeaders(ethUtil.bufferToHex(buffer)).estimateGas({gas: 7e6, from: from});
    return estimatedGas;
}

async function getLastSubmittedBlockNumber(PlasmaContract) {
    let lastBlock = await PlasmaContract.methods.lastBlockNumber().call();
    return lastBlock;
}

async function getLastSubmittedBlockHash(PlasmaContract) {
    let hash = await PlasmaContract.methods.hashOfLastSubmittedBlock().call();
    return hash;
}

// async function canWriteBlocks(from) {
	
// }