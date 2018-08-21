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
        let receipt = await web3.eth.getTransactionReceipt("0x714de0bf251a1712c61e51a8a08f9bf5280ee32109ac7166087be916dbf1b4cb");
        console.log(receipt);
        return;
        const withdrawIndex = new BN("856519558037504");
        const details = await getDetails();
        const value = new BN("1000000000");
        const PlasmaContract = new web3.eth.Contract(details.abi, details.address, {from: operatorAddress});
        const buyoutsContract = await PlasmaContract.methods.buyoutsContract().call();
        const record = await PlasmaContract.methods.withdrawRecords(withdrawIndex).call();
        console.log(record);
    }
    catch(error) {
        console.log(error)   
    }
}

startWithdraw()
