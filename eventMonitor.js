const config = require('./config');
const Web3 = require('web3');
const TruffleContract = require('truffle-contract');
const redis = require("redis");
const getRedisFunctions = require("./createRedis");
console.log("Node address is " + config.ethNodeAddress);

const web3 = new Web3(new Web3.providers.HttpProvider(config.ethNodeAddress));
const PlasmaContractModel = TruffleContract(require("./contracts/build/contracts/PlasmaParent.json"));
const PlasmaContract = new web3.eth.Contract(PlasmaContractModel.abi, config.contractAddress, {from: config.fromAddress});
const {initMQ} = require("./functions/initMQ");
const {processBlockForEvent} = require("./functions/processBlockForEvent")
const eventNames = ["DepositEvent", "WithdrawRequestAcceptedEvent", "DepositWithdrawStartedEvent"];

async function startBlockProcessing() {
    // init MQ
    const mq = await initMQ(redis, eventNames)
    // start loop 
    const redisClient = redis.createClient(config.redis);
    const redisFunctions = await getRedisFunctions(redisClient);
    const {redisGet, redisSet} = redisFunctions;
    let fromBlock = await redisGet("fromBlock");
    fromBlock = Number.parseInt(fromBlock);

    processBlockForEvents(fromBlock)().then((_dispose) => {
        console.log("Started block processing loop");
    });

    function processBlockForEvents(previousBlockNumber) {
        return async function() {
            try{
                let lastblock = await web3.eth.getBlockNumber();
                lastblock = lastblock - config.blocks_shift;
                if (previousBlockNumber === -1) {
                    previousBlockNumber = lastblock-1;
                }
                if (lastblock > previousBlockNumber) {
                    lastblock = previousBlockNumber + 1;
                    // lastProcessedBlock = lastblock;
                    console.log("Started at block " + lastblock);
                    await processBlock(lastblock)();
                    await redisSet("fromBlock", lastblock);
                    setTimeout(processBlockForEvents(lastblock), 100);
                    return;
                } else {
                    setTimeout(processBlockForEvents(lastblock), 1000);
                    return;
                }
            }
            catch(error) {
                console.log("Error processing block for events : " + error);
                if (error.name == "Submitting too far in future") {
                    setImmediate(processBlock(error.message));
                    return;
                }
                setImmediate(processBlockForEvents(previousBlockNumber));
            }
        }
    }

    function processBlock(blockNumber) {
        return async function() {
            for (const eventName of eventNames) {
                const numProcessed = await processBlockForEvent(blockNumber, eventName, PlasmaContract, mq)
                console.log("Processed " + numProcessed + " of events " + eventName + " in block " + blockNumber)
            }
        }
    }
}

startBlockProcessing().catch(err => { console.log(err); process.exit(1); });