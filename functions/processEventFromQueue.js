const rp = require("request-promise-native");

async function processEventFromQueue(eventName, mq, processorEndpoint) {
    let msg = await mq.receiveMessage({qname: `event-${eventName}`});
    if (!msg.id) {
        return null
    }
    const mess = JSON.parse(msg.message)
    console.log("Processing " + JSON.stringify(mess));
    const options = {
        method: 'POST',
        uri: `http://${processorEndpoint}/processEvent/${eventName}`,
        body: mess,
        json: true 
    };
    const result = await rp(options);
    if (result.error === false || (result.error && result.description === 'duplicate')) {
        await mq.deleteMessage({qname: `event-${eventName}`, id: msg.id})
        if (result.action !== undefined) {
            return result
        }
        return null
    } else {
        console.log(`Error processing message ${msg.id}: ${result.description}`)
    }
    return result
}

module.exports = {processEventFromQueue}