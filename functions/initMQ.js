const RSMQPromise = require('rsmq-promise');

async function initMQ(redis, eventNames) {
    const mq = new RSMQPromise(redis);
    let allQueues = await mq.listQueues();
    for (const queue of allQueues) {
        await mq.deleteQueue({qname: queue});
    }
    allQueues = await mq.listQueues();
	for (const eventName of eventNames) {
	    const qname = `event-${eventName}`;
	    if (!allQueues.includes(qname)) {
            await mq.createQueue({qname});
        }
    }
    console.log(allQueues);
    return mq
}

module.exports = {initMQ}