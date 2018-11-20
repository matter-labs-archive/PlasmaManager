const ethUtil = require("ethereumjs-util");
const rp = require("request-promise-native");

async function getLastWrittenBlock(writerEndpoint) {
    const options = {
        method: 'GET',
        uri: `http://${writerEndpoint}/lastWrittenBlock`,
        timeout: 30*1000,
        json: true 
    };
    let result = await rp(options);
    if (result.error) {
        throw Error("Can not get last written block");
    }
    return result.blockNumber;
}

module.exports = {getLastWrittenBlock}


