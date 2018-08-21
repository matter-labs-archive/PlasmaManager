const ethUtil = require("ethereumjs-util");
const BN = ethUtil.BN;
const rp = require("request-promise-native");
const operatorAddress = "0xf62803ffaddda373d44b10bf6bb404909be0e66b"
const assert = require('assert');
const Web3 = require("web3");
const web3 = new Web3("https://rinkeby.infura.io");
const addingResult = web3.eth.accounts.wallet.add('0x7e2abf9c3bcd5c08c6d2156f0d55764602aed7b584c4e95fa01578e605d4cd32');

const {PlasmaTransactionWithNumberAndSignature} = require('../lib/Tx/RLPtxWithNumberAndSignature');
const {PlasmaTransactionWithSignature} = require('../lib/Tx/RLPtxWithSignature');
const Block = require("../lib/Block/RLPblock");

async function getDetails() {
    const options = {
        method: "GET",
        uri: "https://plasma.bankex.team/api/details",
        json: true
    }
    const res = await rp(options);
    return res;
}

async function getProof(txObject) {
    const {blockNumber,
        outputNumber,
        txNumber} = txObject;
    const body = {blockNumber, txNumber, outputNumber};
    const options = {
        method: "POST",
        uri: "https://plasma.bankex.team/proof/getProof",
        body: body,
        json: true
    }
    const res = await rp(options);
    return res;

}

async function startWithdraw() {
    try{

        let rawTX = Buffer.from("f8aef86901edec840000030c840000000000a00000000000000000000000000000000000000000000000000000000000000000f838f700946394b37cf80a7358b38068f0ca4760ad49983a1ba0000000000000000000000000000000000000000000000000002386f26fc100001ca019326b087da978e71b85841932d7839380d7524e9ee44bf3cfcd461685c3a91ca01271121bb55180ba88e9dfc8ed9e0f85b5f5af8824cbdfd68139693a98c78667",'hex')
        tx = new PlasmaTransactionWithSignature(rawTX);
        const details = await getDetails();
        const PlasmaContract = new web3.eth.Contract(details.abi, details.address, {from: operatorAddress});
        const withdrawCollateral = await PlasmaContract.methods.WithdrawCollateral().call();

        const deposit = {
            blockNumber: 810,
            txNumber: 0,
            outputNumberInTransaction: 0,
        }

        const {serializedTX, proof} = await getProof({
            blockNumber: deposit.blockNumber,
            txNumber: deposit.txNumber,
            outputNumber: deposit.outputNumberInTransaction})

        const withdrawalProof = {
            serializedTX, proof
        }

        const gasEstimate = await PlasmaContract.methods.startWithdraw(
            deposit.blockNumber,
            deposit.outputNumberInTransaction,
            withdrawalProof.serializedTX,
            withdrawalProof.proof
          ).estimateGas({ value: withdrawCollateral });

        const startWithdrawResult = await PlasmaContract.methods.startWithdraw(
            deposit.blockNumber,
            deposit.outputNumberInTransaction,
            withdrawalProof.serializedTX,
            withdrawalProof.proof
          ).call({ value: withdrawCollateral });

          const receipt = await PlasmaContract.methods.startWithdraw(
            deposit.blockNumber,
            deposit.outputNumberInTransaction,
            withdrawalProof.serializedTX,
            withdrawalProof.proof).send(
            { from: operatorAddress, value: withdrawCollateral, gas: gasEstimate})
          console.log("Done");
    }
    catch(error) {
        console.log(error)   
    }
}

startWithdraw()
