const rp = require("request-promise-native");

async function writeBlock(block, writerEndpoint) {
    console.log("Writing to " + writerEndpoint)
    if (block === undefined || block === null || block.length === undefined || block.length === 0) {
        console.log("Block is empty");
        return false;
    }
    try {
        console.log("Block size = " + block.length + " bytes");
        const options = {
            method: 'POST',
            uri: `http://${writerEndpoint}/writeBlock`,
            body: block, // Buffer !
            headers: {
                'content-type': "application/octet-stream"
            },
            timeout: 30*1000
        };
        let writeResult = await rp(options);
        if (writeResult.error == true) {
            if (writeResult.description == "duplicate") {
                console.log("Duplicate write");
                return true;
            }
            return false
        } else {
            return true
        }
    } catch(e) {
        return false
    }
}

module.exports = {writeBlock}