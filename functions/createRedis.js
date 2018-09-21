const util = require("util");

function getRedisFunctions(redisClient) {
    const redisExists = util.promisify(redisClient.exists).bind(redisClient);
    const redisGet = util.promisify(redisClient.get).bind(redisClient);
    const redisSet = util.promisify(redisClient.set).bind(redisClient);
    const redisIncr = util.promisify(redisClient.incr).bind(redisClient);
    const redisScript = util.promisify(redisClient.SCRIPT).bind(redisClient);
    const redisEvalSHA = util.promisify(redisClient.evalsha).bind(redisClient);
    const redisFunctions = {
        redisExists, redisGet, redisSet, redisIncr, redisScript, redisEvalSHA
    };
    return redisFunctions;
}

module.exports = getRedisFunctions;