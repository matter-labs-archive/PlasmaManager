const config = require('../config');
const ethUtil = require("ethereumjs-util");
const BN = ethUtil.BN;

const {allAccounts, allPrivateKeys} = require("./accounts");

const operatorAddress = allAccounts[0]
const userAddress = allAccounts[1]

const Web3 = require("web3");
const TruffleContract = require('truffle-contract');
const web3 = new Web3(config.ethNodeAddress);
const PlasmaContractModel = TruffleContract(require("../contracts/build/contracts/PlasmaParent.json"));
const PlasmaContract = new web3.eth.Contract(PlasmaContractModel.abi, config.contractAddress, {from: operatorAddress});

const {PlasmaTransactionWithNumberAndSignature} = require('../lib/Tx/RLPtxWithNumberAndSignature');
const {PlasmaTransactionWithSignature} = require('../lib/Tx/RLPtxWithSignature');
const Block = require("../lib/Block/RLPblock");

const {getBlock} = require("./getBlock")

function convertForRemix(hexString){
    const hex = ethUtil.addHexPrefix(hexString);
    const bArray = ethUtil.toBuffer(hex);
    const encodedArray = [];
    for (var i=0; i<bArray.length; i++) {
        const b = bArray.slice(i, i+1);
        const h = ethUtil.addHexPrefix(ethUtil.bufferToHex(b));
        encodedArray.push(h);
    }
    return encodedArray;
}

async function startWithdraw(blk, txNum) {
    try{
        const account = userAddress;
        const blockBuffer = await getBlock(blk);
        const block = new Block(blockBuffer);
        const tx = block.transactions[txNum];
        // console.log(JSON.stringify(convertForRemix(tx.serialize())))
        const txNoNumber = tx.signedTransaction;
        const txNumberInBlock = new BN(tx.txNumberInBlock)
        const proof = block.merkleTree.getProof(txNumberInBlock, true);
        const output = txNoNumber.transaction.outputs[0];
        const withdrawIndex = new BN(blk)
        withdrawIndex.iushln(40)
        withdrawIndex.iadd(txNumberInBlock.ushln(8))
        const gas = await PlasmaContract.methods.startWithdraw(blk,
            txNumberInBlock,
            0,
            ethUtil.bufferToHex(tx.serialize()),
            ethUtil.bufferToHex(proof)
        ).estimateGas({from: account})
        const result = await PlasmaContract.methods.startWithdraw(blk,
            txNumberInBlock,
            0,
            ethUtil.bufferToHex(tx.serialize()),
            ethUtil.bufferToHex(proof)
            ).send({from: account, gas: gas})
        console.log(JSON.stringify(result.events["WithdrawRequestAcceptedEvent"].returnValues));
        return 
    }
    catch(error) {
        console.log(error)   
    }
}

startWithdraw(1,0)
