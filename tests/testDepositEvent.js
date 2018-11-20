const config = require('../config');
var storage;
if (config.debug) {
    storage = require('../blockstorage/localBlockStorage');
} else {
    storage = require('../blockstorage/digitalOceanStorage');
}
const {addresses, keys} = require("../testScripts/keys");
const alice = keys[1];
const aliceAddress = addresses[1];

const {initMQ} = require('../functions/initMQ');
const {assembleBlock} = require("../functions/assembleBlock");
const {getBlockHash} = require("../functions/getBlockHash");
const {processBlockForEvent} = require("../functions/processBlockForEvent");
const {writeBlock} = require("../functions/writeBlock");
const {processEventFromQueue} = require("../functions/processEventFromQueue");
const {getLastWrittenBlock} = require("../functions/getLastWrittenBlock");
const {getUTXOlist} = require("../functions/getUTXOlist");

const ethUtil = require('ethereumjs-util');
const Web3 = require('web3');
const web3 = new Web3(config.ethNodeAddress);
web3.eth.accounts.wallet.add(ethUtil.bufferToHex(alice));
const PlasmaContract = new web3.eth.Contract(config.contractDetails.abi, config.contractDetails.address, {from: config.fromAddress});
const assert = require("assert")
const {Block} = require("../lib/Block/RLPblock");

async function putDeposit() {
    const allAccounts = await web3.eth.getAccounts();
    const account = allAccounts[1]
    assert(account.toLowerCase() === aliceAddress.toLowerCase())
    const oneETH = Web3.utils.toWei("1", "ether");
    console.log("Depositing 1 ETH for " + account);
    let gas = await PlasmaContract.methods.deposit().estimateGas({from: account, value: oneETH})
    console.log("Deposit gas price is " + gas);
    gas = 200000
    const result = await PlasmaContract.methods.deposit().send({from: account, value: oneETH, gas: gas})
    return result
}

const eventNames = ["DepositEvent"]
async function main() {
    const mq = await initMQ(config.redis, eventNames)
    let receipt = await putDeposit()
    let blockNumber = receipt.blockNumber
    for (let i = 0; i < 10; i++) {
        let processed = await processBlockForEvent(blockNumber, "DepositEvent", PlasmaContract, mq)
        assert(processed === 1);
        let result = await processEventFromQueue("DepositEvent", mq, "127.0.0.1:3001")
        if (result !== null) {
            console.log(result)
            throw Error("Fatal")
        }
    }
    const lastWrittenBlock = await getLastWrittenBlock("127.0.0.1:3001")
    const plasmaBlockNumber = lastWrittenBlock.blockNumber.toString(10)
    let hash = Buffer.alloc(32)
    const assembledBlock = await assembleBlock(plasmaBlockNumber+1, hash, "127.0.0.1:3001")
    let parsedBlock = new Block(assembledBlock);
    assert(parsedBlock.transactions.length === 1);
    assert(ethUtil.bufferToHex(parsedBlock.transactions[0].transaction.outputs[0].recipient) == aliceAddress);
    const writingSuccess = await writeBlock(assembledBlock, "127.0.0.1:3001")
    console.log(writingSuccess)
    const list = await getUTXOlist(aliceAddress, "127.0.0.1:3001")
    assert(list.utxos.length === 1);
}

main().then(() => {
    console.log("Done");
}).catch((err) => {
    console.log(err);
})