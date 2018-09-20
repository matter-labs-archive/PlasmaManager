const config = require('./config');
let storage;
if (config.debug) {
	storage = require('./blockstorage/localBlockStorage');
} else {
	storage = require('./blockstorage/digitalOceanStorage');
}
const redis = require("redis");
const Web3 = require('web3');
const {initMQ} = require("./functions/initMQ");
const {processExitChallengeFromQueue} = require("./functions/processExitChallenge");
const {processDepositExitChallengeFromQueue} = require("./functions/processDepositExitChallenge");
const eventNames = ["DepositEvent", "ExitStartedEvent", "DepositWithdrawStartedEvent"];

async function startChallengeProcessing() {
    // init MQ

    const redisClient = redis.createClient(config.redis);
    const mq = await initMQ(redisClient, eventNames)
    const contractDetails = await config.contractDetails();
    const web3 = new Web3(config.ethNodeAddress);
    web3.eth.accounts.wallet.add(config.blockSenderKey);
    const PlasmaContract = new web3.eth.Contract(contractDetails.abi, contractDetails.address, {from: config.fromAddress});

    // start loop to pop events from queue
	setTimeout(processChallenges, 1000);
    
    async function processChallenges() {
        await processExitChallengeFromQueue("ExitStartedEvent", mq, PlasmaContract, storage, web3)
        await processDepositExitChallengeFromQueue("DepositWithdrawStartedEvent", mq, PlasmaContract, storage, web3)
        setTimeout(processChallenges, 1000);
    }
}

startChallengeProcessing().catch(err => { console.log(err); process.exit(1); });
