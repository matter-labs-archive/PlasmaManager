async function addChallengeToQueue(eventName, eventDetails, challengeDetails, mq) {
    const combined = {event: eventDetails, challenge: challengeDetails, name: eventName}
    try {
        await mq.sendMessage({qname: `eventchallenge-${eventName}`, message: JSON.stringify(combined)});
    } catch(error) {
        console.log(error);
        throw Error("Panic, error posting challenge to queue");
    }
    return
}

module.exports = {addChallengeToQueue}