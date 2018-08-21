const config = require('../config');
const ethUtil = require('ethereumjs-util');
const Web3 = require('web3');
const BN = Web3.utils.BN;
const TruffleContract = require('truffle-contract');
const rp = require("request-promise-native");
// const axios = require('axios');
const {allAccounts, allPrivateKeys} = require("./accounts");

const operatorAddress = allAccounts[0]
const userAddress = allAccounts[1]
const web3 = new Web3(config.ethNodeAddress);
const PlasmaContractModel = new TruffleContract(require("../contracts/build/contracts/PlasmaParent.json"));

const PlasmaContract = new web3.eth.Contract(PlasmaContractModel.abi, config.contractAddress, {from: operatorAddress});

const eventNames = ["WithdrawStartedEvent", 
                "WithdrawRequestAcceptedEvent", "WithdrawFinalizedEvent", 
                "ExitStartedEvent","DepositEvent",
                "DepositWithdrawStartedEvent", "DepositWithdrawChallengedEvent", 
                "DepositWithdrawCompletedEvent"];

async function putDeposit() {
    const allAccounts = await web3.eth.getAccounts();
    const account = userAddress;
    const oneETH = Web3.utils.toWei("1", "ether");
    console.log("Depositing 1 ETH for " + account);
    let gas = await PlasmaContract.methods.deposit().estimateGas({from: account, value: oneETH})
    console.log("Deposit gas price is " + gas);
    gas = 200000
    const result = await PlasmaContract.methods.deposit().send({from: account, value: oneETH, gas: gas})
    console.log("Done")
}

module.exports = putDeposit;

putDeposit();