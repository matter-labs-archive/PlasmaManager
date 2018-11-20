async function processBlockForEvent(blockNumber, eventName, PlasmaContract, mq) {
    const allEvents = await PlasmaContract.getPastEvents(eventName, {
        fromBlock: blockNumber,
        toBlock: blockNumber
    });
    if (allEvents.length === 0) {
        return 0
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
        return 0
    }
    for (const ev of allEventsJSON) {
        try {
            await mq.sendMessage({qname: `event-${eventName}`, message: JSON.stringify(ev)});
        } catch(error) {
            console.log(error);
            throw Error("Panic, error posting event to queue");
        }
    }
    return allEventsJSON.length
}

module.exports = {processBlockForEvent}