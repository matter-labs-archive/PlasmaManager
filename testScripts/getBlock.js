const fs = require("fs")

async function getBlock(number) {
    const blockBuffer = fs.readFileSync(__dirname + "/blocks/"+number)
    return blockBuffer
}

module.exports = {getBlock}