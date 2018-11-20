const config = require('../config');
var storage;
if (config.debug) {
    storage = require('../blockstorage/localBlockStorage');
} else {
    storage = require('../blockstorage/digitalOceanStorage');
}
const {addresses, keys} = require("../testScripts/keys");
const operatorAddress = addresses[0];
const alice = keys[1];
const aliceAddress = addresses[1];
const bobAddress = addresses[2];

const {initMQ} = require('../functions/initMQ');
const {assembleBlock} = require("../functions/assembleBlock");
const {getBlockHash} = require("../functions/getBlockHash");
const {processBlockForEvent} = require("../functions/processBlockForEvent");
const {writeBlock} = require("../functions/writeBlock");
const {processEventFromQueue} = require("../functions/processEventFromQueue");
const {getLastWrittenBlock} = require("../functions/getLastWrittenBlock");
const {getUTXOlist} = require("../functions/getUTXOlist");
const {createTransaction, parseTransactionIndex} = require("../functions/createTransaction");
const {sendTransaction} = require("../functions/sendTransaction");

const ethUtil = require('ethereumjs-util');
const Web3 = require('web3');
const web3 = new Web3(config.ethNodeAddress);
web3.eth.accounts.wallet.add(ethUtil.bufferToHex(alice));
const PlasmaContract = new web3.eth.Contract(config.contractDetails.abi, config.contractDetails.address, {from: config.fromAddress});
const assert = require("assert")
const {Block} = require("../lib/Block/RLPblock");
const BlockHeaderLength = 137

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

async function startExit(blockNumber, outputNumber, transaction, proof) {
    const allAccounts = await web3.eth.getAccounts();
    const account = allAccounts[2]
    assert(account.toLowerCase() === bobAddress.toLowerCase())
    console.log("Starting exit for " + account);
    const exitCollateral = await PlasmaContract.methods.WithdrawCollateral().call();
    // startExit(
    //     uint32 _plasmaBlockNumber, // block with the transaction
    //     uint8 _outputNumber,    // output being exited
    //     bytes _plasmaTransaction, // transaction itself
    //     bytes _merkleProof) // proof
    const transactionHex = ethUtil.bufferToHex(transaction);
    const proofHex = ethUtil.bufferToHex(proof);
    let gas = await PlasmaContract.methods.startExit(blockNumber, outputNumber, transactionHex, proofHex).estimateGas({from: account, value: exitCollateral})
    console.log("Starting exit gas price is " + gas);
    gas = 1000000
    const result = await PlasmaContract.methods.startExit(blockNumber, outputNumber, transactionHex, proofHex).send({from: account, value: exitCollateral, gas: gas})
    return result
}

async function commitHeader(block) {
    const allAccounts = await web3.eth.getAccounts();
    const account = allAccounts[0];
    assert(account.toLowerCase() === operatorAddress.toLowerCase())
    const slice = block.slice(0, BlockHeaderLength);
    const headerHex = ethUtil.bufferToHex(slice);
    const previousCommitedBlock = await PlasmaContract.methods.lastBlockNumber().call()
    let gas = await PlasmaContract.methods.submitBlockHeaders(headerHex).estimateGas({from: account})
    console.log("Header submission gas price is " + gas);
    gas = 200000
    const result = await PlasmaContract.methods.submitBlockHeaders(headerHex).send({from: account, gas: gas})
    const newBlockNumber = await PlasmaContract.methods.lastBlockNumber().call()
    assert(Number.parseInt(newBlockNumber) == Number.parseInt(previousCommitedBlock) + 1);
    return result
}

async function getLastCommittedBlockHash() {
    const hash = await PlasmaContract.methods.hashOfLastSubmittedBlock().call();
    return ethUtil.toBuffer(hash);
}

const eventNames = ["DepositEvent", "ExitStartedEvent"];

async function main() {
    const mq = await initMQ(config.redis, eventNames)
    let receipt = await putDeposit()
    let blockNumber = receipt.blockNumber
    let processed = await processBlockForEvent(blockNumber, "DepositEvent", PlasmaContract, mq)
    assert(processed === 1);
    let result = await processEventFromQueue("DepositEvent", mq, "127.0.0.1:3001")
    if (result !== null) {
        console.log(result)
        throw Error("Fatal")
    }
    const lastWrittenBlock = await getLastWrittenBlock("127.0.0.1:3001")
    const plasmaBlockNumber = lastWrittenBlock.blockNumber
    let hash = await getBlockHash(plasmaBlockNumber, storage, BlockHeaderLength);
    let hashFromContract = await getLastCommittedBlockHash();
    // console.log(Buffer.from(hash).toString('hex'))
    // console.log(hashFromContract.toString('hex'))
    assert(hash.equals(hashFromContract));

    // assemble block number 1
    let assembledBlock = await assembleBlock(1, hash, "127.0.0.1:3001")
    await storage.storeBlock(assembledBlock);
    let parsedBlock = new Block(assembledBlock);
    // console.log(parsedBlock.from.toString('hex'));
    assert(parsedBlock.transactions.length === 1);
    assert(ethUtil.bufferToHex(parsedBlock.transactions[0].transaction.outputs[0].recipient) == aliceAddress);
    let writingSuccess = await writeBlock(assembledBlock, "127.0.0.1:3001")
    assert(writingSuccess);
    let list = await getUTXOlist(aliceAddress, "127.0.0.1:3001")
    assert(list.utxos.length === 1);
    let commitSuccess = await commitHeader(assembledBlock);

    hash = await getBlockHash(1, storage, BlockHeaderLength);
    hashFromContract = await getLastCommittedBlockHash();
    // console.log(Buffer.from(hash).toString('hex'))
    // console.log(hashFromContract.toString('hex'))
    assert(hash.equals(hashFromContract));

    const am = "1000000000000000000"
    const inputs = [{blockNumber: 1, txNumberInBlock: 0, outputNumberInTransaction: 0,
        amount: am // 1 ETH
    }];
    const outputs = [{to: bobAddress, amount: am}]
    const transaction = createTransaction(1, inputs, outputs, alice);
    const serializedTX = transaction.serialize()
    const sendingResult = await sendTransaction(ethUtil.bufferToHex(serializedTX), "127.0.0.1:3001")
    assert(sendingResult.error === false);
    list = await getUTXOlist(aliceAddress, "127.0.0.1:3001")
    assert(list.utxos.length === 0);

    // assemble block number 2
    assembledBlock = await assembleBlock(2, hash, "127.0.0.1:3001");
    await storage.storeBlock(assembledBlock);
    parsedBlock = new Block(assembledBlock);
    // console.log(parsedBlock.from.toString('hex'));
    assert(parsedBlock.transactions.length === 1);
    assert(ethUtil.bufferToHex(parsedBlock.transactions[0].transaction.outputs[0].recipient) == bobAddress);
    writingSuccess = await writeBlock(assembledBlock, "127.0.0.1:3001");
    assert(writingSuccess);
    list = await getUTXOlist(bobAddress, "127.0.0.1:3001");
    assert(list.utxos.length === 1);
    commitSuccess = await commitHeader(assembledBlock);

    // prepare proof and withdraw
    let proof = parsedBlock.getProofForTransaction(serializedTX);
    assert(proof !== null);
    let binaryProof = proof.proof;

    let exitStartResult = await startExit(2, 0, serializedTX, binaryProof);

    blockNumber = exitStartResult.blockNumber
    processed = await processBlockForEvent(blockNumber, "ExitStartedEvent", PlasmaContract, mq)
    assert(processed === 1);
    result = await processEventFromQueue("ExitStartedEvent", mq, "127.0.0.1:3001")
    if (result !== null) {
        console.log(result)
        throw Error("Fatal")
    }
    list = await getUTXOlist(bobAddress, "127.0.0.1:3001");
    assert(list.utxos.length === 0);
}

main().then(() => {
    console.log("Done");
}).catch((err) => {
    console.log(err);
})
