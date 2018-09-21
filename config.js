// uploaded = available on azure blob storage
// submitted = block header posted to the plasma parent contract

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

const env = process.env;
const fs = require("fs");
// don't load .env file in prod
if (env.NODE_ENV !== 'production') {
	require('dotenv').load();
}

module.exports = {
	debug: env.DEBUG === "TRUE" ? true : false,
	port: env.PORT || 4000,
	verbose: Number.parseInt(env.VERBOSE) || 0,
	gasLimit: 1e6,
	blockAssemblyInterval: 60 * 1000,
	blockWritingInterval: 5 * 1000,
	connectionString: env.STORAGE_CONNECTION_STRING,
	storageBucket: env.STORAGE_BUCKET || "stage",
	blockHeaderLength: 4 + 4 + 32 + 32 + 65,
	fromBlock: env.FROM_BLOCK || "1",
	assemblerEndpoint: env.ASSEMBLER_ENDPOINT || "assembler",
	writerEndpoint: env.WRITER_ENDPOINT || "blockwriter",
	processorEndpoint: env.EVENTPROCESSOR_ENDPOINT || "eventprocessor",
	txProcessorEndpoint: env.TX_PROCESSOR_ENDPOINT || "txProcessor",
	fromAddress: env.ETH_FROM,
	ethNodeAddress: env.ETH_NODE || 'http://localhost:8545',
	blockSenderKey: env.ETH_KEY || "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",
	// contractAddress: require('./details.json').address,
	contractDetails: getContractDetails,

	redis: {
		host: env.REDIS_HOST || 'localhost',
		port: Number.parseInt(env.REDIS_PORT, 10) || 6379,
        string_numbers: true,
        password: env.REDIS_PASSWORD
	},

	blocks_shift: Number.parseInt(env.BLOCKS_SHIFT, 10) || 1,
};

async function getContractDetails() {
	const useSharedFolder = env.USE_SHARED_FOLDER === "TRUE" ? true : false;
	const sharedFolderPath = env.SHARED_FOLDER_PATH || ""
	if (useSharedFolder) {
		const path = sharedFolderPath + "details"
		while (!fs.existsSync(path)) {
			await sleep(5000)
		}
		const contractDetails = JSON.parse(fs.readFileSync(path).toString("utf8"))
		return contractDetails
	}
	const contractDetails = JSON.parse(fs.readFileSync(__dirname+"/contracts/build/details").toString("utf8"))
	return contractDetails
}