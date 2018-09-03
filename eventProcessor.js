const config = require('./config');
const ethUtil = require('ethereumjs-util');
const Web3 = require('web3');
const BN = Web3.utils.BN;
const TruffleContract = require('truffle-contract');
const rp = require("request-promise-native");
const redis = require("redis");
const getRedisFunctions = require("./createRedis");
console.log("Node address is " + config.ethNodeAddress);

const web3 = new Web3(new Web3.providers.HttpProvider(config.ethNodeAddress));
const PlasmaContractModel = TruffleContract(require("./contracts/build/contracts/PlasmaParent.json"));
const PlasmaContract = new web3.eth.Contract(PlasmaContractModel.abi, config.contractAddress, {from: config.fromAddress});
const {initMQ} = require("./functions/initMQ");
const {processEventFromQueue} = require("./functions/processEventFromQueue");
const eventNames = ["DepositEvent", "WithdrawRequestAcceptedEvent", "DepositWithdrawStartedEvent"];

async function startEventProcessing() {
    // init MQ
    const mq = await initMQ(redis, eventNames)

    // start loop to pop events from queue
	setInterval(processEvents, 10);
    
    async function processEvents() {
	    for (const eventName of eventNames) {
            const res = await processEventFromQueue(eventName, mq, config.processorEndpoint)
	    }
    }
}

startBlockProcessing().catch(err => { console.log(err); process.exit(1); });