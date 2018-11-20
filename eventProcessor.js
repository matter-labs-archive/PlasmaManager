const config = require('./config');
const redis = require("redis");

const {initMQ} = require("./functions/initMQ");
const {processEventFromQueue} = require("./functions/processEventFromQueue");
const eventNames = ["DepositEvent", "ExitStartedEvent", "DepositWithdrawStartedEvent"];

async function startEventProcessing() {
    // init MQ
    // const redisClient = redis.createClient(config.redis);
    const mq = await initMQ(config.redis, eventNames)
    // start loop to pop events from queue
    setTimeout(processEvents, 1000);
    
    async function processEvents() {
        // console.log("Processing events")
	    for (const eventName of eventNames) {
            const res = await processEventFromQueue(eventName, mq, config.processorEndpoint)
        }
        setTimeout(processEvents, 1000);
    }
}

startEventProcessing().catch(err => { console.log(err); process.exit(1); });