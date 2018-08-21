const config = require('./config');
const ethUtil = require('ethereumjs-util');
const Web3 = require('web3');
const BN = Web3.utils.BN;
const TruffleContract = require('truffle-contract');
const rp = require("request-promise-native");
// const axios = require('axios');
const RSMQPromise = require('rsmq-promise');
const redis = require("redis");
const getRedisFunctions = require("./createRedis");
console.log("Node address is " + config.ethNodeAddress);

const web3 = new Web3(new Web3.providers.HttpProvider(config.ethNodeAddress));
const PlasmaContractModel = TruffleContract(require("./contracts/build/contracts/PlasmaParent.json"));

const PlasmaContract = new web3.eth.Contract(PlasmaContractModel.abi, config.contractAddress, {from: config.fromAddress});

// const eventNames = ["WithdrawStartedEvent",
//                 "WithdrawRequestAcceptedEvent", "WithdrawFinalizedEvent",
//                 "ExitStartedEvent","DepositEvent",
//                 "DepositWithdrawStartedEvent", "DepositWithdrawChallengedEvent",
//                 "DepositWithdrawCompletedEvent"];




const eventNames = ["DepositEvent", "WithdrawRequestAcceptedEvent", "DepositWithdrawStartedEvent"];

async function startBlockProcessing() {
	const mq = new RSMQPromise(config.redis);
	const allQueues = await mq.listQueues();
	for (const eventName of eventNames) {
	    const qname = `event-${eventName}`;
	    if (!allQueues.includes(qname)) {
            await mq.createQueue({qname});
        }
	}
	setInterval(processEvents, 10);

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
                const allEvents = await PlasmaContract.getPastEvents(eventName, {
                    fromBlock: blockNumber,
                    toBlock: blockNumber
                });
                if (allEvents.length === 0) {
                    continue
                }
                const allEventsJSON = allEvents
                .map((ev) => {
                    return ev.returnValues;
                })
                .map((ev) => {
                    for (const key of Object.keys(ev)) {
                        if (typeof ev[key].toNumber === 'function') {
                            ev[key] = toString(10);
                        }
                    }
                    return ev;
                })
                if (allEventsJSON.length === 0) {
                    continue
                }
                for (const ev of allEventsJSON) {
                    try {
                        await mq.sendMessage({qname: `event-${eventName}`, message: JSON.stringify(ev)});
                    } catch(error) {
                        console.log(error);
                        throw Error("Panic, error posting event to queue");
                    }
                }
            }
        }
    }
    
    async function processEvents() {
	    for (const eventName of eventNames) {
	        try {
		        let msg = await mq.receiveMessage({qname: `event-${eventName}`});
		        if (!msg.id) {
		            // no messages
		            continue;
                }
                console.log("Processing " + JSON.parse(msg.message));
                const options = {
                    method: 'POST',
                    uri: `http://${config.assemblerEndpoint}/processEvent/${eventName}`,
                    body: JSON.parse(msg.message),
                    json: true 
                };
		        const result = await rp(options);
		        if (result.error === false || (result.error && result.description === 'duplicate')) {
		            await mq.deleteMessage({qname: `event-${eventName}`, id: msg.id})
                } else {
		            console.log(`Error processing message ${msg.id}: ${result.description}`)
                }
	        } catch (error) {
		        console.log(`Error processing event ${eventName}: ${error}`);
	        }
	    }
    }
}

startBlockProcessing().catch(err => { console.log(err); process.exit(1); });