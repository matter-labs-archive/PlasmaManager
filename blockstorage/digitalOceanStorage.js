const config = require('./blockstorageConfig');
const aws = require('aws-sdk');
const s3 = new aws.S3({endpoint: new aws.Endpoint(config.connectionString)});

async function getManifest() {
    let manifest = {lastBlock: 0};
    try {
        let result = await s3.getObject({Bucket: config.storageBucket, Key: 'plasma/manifest'}).promise();
        manifest = JSON.parse(result.Body);
    } catch (error) {
        // If manifest don't exist, create a default one
        if (error.statusCode == 404) {
            await setManifest(manifest);
        } else {
            throw error;
        }
    }
    return manifest;
}

async function setManifest(manifest) {
    await s3.upload({Bucket: config.storageBucket, Key: 'plasma/manifest', Body: JSON.stringify(manifest), ACL: 'public-read', ContentType: 'application/json'}).promise();
}

module.exports = {
    getLastUploadedBlockNumber: async function() {
        let manifest = await getManifest();
        return manifest.lastBlock;
    },
    getBlock: async function(blockNumber) {
        if (typeof blockNumber.toString() === 'function') {
            blockNumber = blockNumber.toString(10);
        }
        let block = await s3.getObject({Bucket: config.storageBucket, Key: 'plasma/' + blockNumber}).promise();
        if (Buffer.isBuffer(block.Body)){
            return block.Body
        } else {
            const repr = block.Body.toString("base64");
            return Buffer.from(repr, "base64");
        }
        console.log(block.Body);
        return null;
    },
    storeBlock: async function (blockData) {
        let manifest = await getManifest();
        let blockNumber = blockData.readUInt32BE(0);
        if (blockNumber != manifest.lastBlock + 1) {
            throw "Block " + blockNumber + " is out of sequence. Last block is " + manifest.lastBlock;
        }
        manifest.lastBlock++;
        await s3.upload({Bucket: config.storageBucket, Key: 'plasma/' + blockNumber, Body: blockData, ACL: 'public-read'}).promise();
        await setManifest(manifest);
        console.log("uploaded block " + blockNumber);
    },
};