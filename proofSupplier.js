const config = require('./config');
const storage = require('./blockstorage/digitalOceanStorage');
const ethUtil = require("ethereumjs-util");
const rp = require("request-promise-native");
const assert = require('assert');
const Web3 = require("web3");
const BN = Web3.utils.BN;

const validateSchema = require('jsonschema').validate;
const express        = require('express');
const app            = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
if (config.verbose) {
    app.use(function (req, res, next) {
        console.log([req.method, req.url].join(' '));
        next();
      });
}

const {PlasmaTransactionWithNumberAndSignature} = require('./lib/Tx/RLPtxWithNumberAndSignature');
const {PlasmaTransactionWithSignature} = require('./lib/Tx/RLPtxWithSignature');
const Block = require("./lib/Block/RLPblock");

const requestSchema =
{
    "blockNumber" : {"type": "string", "minLength": 1, "maxLength": 64},
    "txNumber" : {"type": "string", "minLength": 1, "maxLength": 64},
    "outputNumber" : {"type": "string", "minLength": 1, "maxLength": 64},
    "required": ["blockNumber", "txNumber", "outputNumber"]
}

const ONE = new BN(1);
const divisor = ONE.ushln(128);

const getBlock = storage.getBlock;
// const {getBlock} = require("./testScripts/getBlock")


function main() {
    app.post('/getProof', async function(req, res) {
        try{
            if (!validateSchema(req.body, requestSchema).valid) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            const blockNumber = Web3.utils.toBN(req.body.blockNumber)
            const txNumber = Web3.utils.toBN(req.body.txNumber);
            const outputNumbber = Web3.utils.toBN(req.body.outputNumber);
            const blockBuffer = await getBlock(req.body.blockNumber);
            const block = new Block(blockBuffer);
            const txNumberInt = txNumber.toNumber();
            const outputNumberInt = outputNumbber.toNumber();
            assert(txNumberInt < block.transactions.length);
            const tx = block.transactions[txNumberInt];
            assert(outputNumberInt < tx.signedTransaction.transaction.outputs.length);
            const serializedTX = ethUtil.bufferToHex(tx.serialize());
            const proof = Buffer.concat(block.merkleTree.getProof(txNumberInt, true));
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