const ethUtil = require("ethereumjs-util");
const rp = require("request-promise-native");

async function getLastWrittenBlock(writerEndpoint) {
	const options = {
		method: 'GET',
		uri: `http://${writerEndpoint}/lastWrittenBlock`,
		timeout: 300*1000,
		json: true 
	};
    let result = await rp(options);
    return result;
}

module.exports = {getLastWrittenBlock}


