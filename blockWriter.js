const config = require('./config');
var storage;
if (config.debug) {
    storage = require('./blockstorage/localBlockStorage');
} else {
    storage = require('./blockstorage/digitalOceanStorage');
}
const assert = require("assert");
const {getLastWrittenBlock} = require('./functions/getLastWrittenBlock');
const {writeBlock} = require("./functions/writeBlock");
const writerEndpoint = config.writerEndpoint;
console.log("Will write to " + writerEndpoint);

async function main() {
    try {
        let lastUploadedBlock = await storage.getLastUploadedBlockNumber();
        let lastWrittenBlock = await getLastWrittenBlock(writerEndpoint);
        console.log("Last uploaded Plasma block is " + lastUploadedBlock);
        console.log("Last written Plasma block is " + lastWrittenBlock);
        lastUploadedBlock = Number.parseInt(lastUploadedBlock)
        lastWrittenBlock = Number.parseInt(lastWrittenBlock)
        if (lastUploadedBlock > lastWrittenBlock) {
            const block = await storage.getBlock(lastWrittenBlock+1);
            const blockWritingResult = await writeBlock(block, writerEndpoint);
            assert(blockWritingResult, "Failed to write a block");
            console.log("Written block " + (lastWrittenBlock + 1));
            setTimeout(main, 1000); // submit the next block
        } else {
            setTimeout(main, config.blockWritingInterval);
        }
    }
    catch (err) {
        console.log(err);
        setTimeout(main, config.blockWritingInterval);
    }
}

main().catch(err => { console.log(err); process.exit(1); });