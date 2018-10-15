const config = require('./config');
const storage = require('./blockstorage/digitalOceanStorage');
const ethUtil = require("ethereumjs-util");
const Web3 = require("web3");

const validateSchema = require('jsonschema').validate;
const express        = require('express');
const app            = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());

const {Block} = require("./lib/Block/RLPblock");

const requestSchema =
{
    "blockNumber" : {"type": "string", "minLength": 1, "maxLength": 64},
    "txNumber" : {"type": "string", "minLength": 1, "maxLength": 64},
    "outputNumber" : {"type": "string", "minLength": 1, "maxLength": 64},
    "required": ["blockNumber", "txNumber"]
}

const getBlock = storage.getBlock;

function main() {
    app.post('/getProof', async function(req, res) {
        try{
            if (!validateSchema(req.body, requestSchema).valid) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            const blockNumber = Web3.utils.toBN(req.body.blockNumber)
            const txNumber = Web3.utils.toBN(req.body.txNumber);
            const blockBuffer = await getBlock(blockNumber.toString(10));
            const block = new Block(blockBuffer);
            const txNumberInt = txNumber.toNumber();
            const proofData = block.getProofForTransactionByNumber(txNumberInt);
            if (proofData === null) {
                return res.json({error: true})
            }
            const {tx, proof} = proofData;
            const serializedTX = ethUtil.bufferToHex(tx.serialize());
            return res.json({error: false, serializedTX, proof: ethUtil.bufferToHex(proof)})
        }
        catch(error) {
            console.log(error);
            return res.json({error: true})
        }
    })
    app.listen(config.port);
    console.log("Started server at port " + config.port);
}
main();