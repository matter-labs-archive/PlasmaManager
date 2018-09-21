const RSMQPromise = require('rsmq-promise');

async function initMQ(redis, eventNames, purge) {
    const mq = new RSMQPromise(redis);
    console.log("Listing existing queues")
    let allQueues = await mq.listQueues();
    console.log(allQueues);
    if (purge !== undefined && purge === true) {
        for (const queue of allQueues) {
            await mq.deleteQueue({qname: queue});
        }
        allQueues = await mq.listQueues();
    }
    console.log("Creating missing queues")
    for (const eventName of eventNames) {
        const qname = `event-${eventName}`;
        if (!allQueues.includes(qname)) {
            await createQueue(mq, qname);
        }
    }
    for (const eventName of eventNames) {
        const qname = `eventchallenge-${eventName}`;
        if (!allQueues.includes(qname)) {
            await createQueue(mq, qname);
        }
    }
    return mq
}

async function createQueue(mq, qname) {
    try {
        await mq.createQueue({qname});
        return true
    } catch(err) {
        return false
    }
}

module.exports = {initMQ}