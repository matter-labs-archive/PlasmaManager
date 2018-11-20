const config = require('./config');
var storage;
if (config.debug) {
    storage = require('./blockstorage/localBlockStorage');
} else {
    storage = require('./blockstorage/digitalOceanStorage');
}
const ethUtil = require("ethereumjs-util");
const Web3 = require("web3");
const validateSchema = require('jsonschema').validate;
const express        = require('express');
const app            = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());

const {Block} = require("./lib/Block/RLPblock");
const {createTransaction} = require("./functions/createTransaction");
const {sendTransaction} = require("./functions/sendTransaction");

const exitRequestSchema =
{
    "blockNumber" : {"type": "string", "minLength": 1, "maxLength": 64},
    "txNumber" : {"type": "string", "minLength": 1, "maxLength": 64},
    "outputNumber" : {"type": "string", "minLength": 1, "maxLength": 64},
    "from": {"type": "string", "minLength": 40, "maxLength": 42},
    "required": ["blockNumber", "txNumber", "outputNumber", "from"]
}

const depositExitRequestSchema =
{
    "depositIndex" : {"type": "string", "minLength": 1, "maxLength": 64},
    "from": {"type": "string", "minLength": 40, "maxLength": 42},
    "required": ["depositIndex", "from"]
}

const depositRequestSchema =
{
    "amount" : {"type": "string", "minLength": 1, "maxLength": 64},
    "for": {"type": "string", "minLength": 40, "maxLength": 42},
    "required": ["amount", "for"]
}

const getBlock = storage.getBlock;

function main() {
    app.post('/startExit', async function(req, res) {
        try{
            if (!validateSchema(req.body, exitRequestSchema).valid) {
                return res.json({error: true, reason: "invalid request"});
            }
            const blockNumber = Web3.utils.toBN(req.body.blockNumber)
            const txNumber = Web3.utils.toBN(req.body.txNumber);
            const outputNumber = Web3.utils.toBN(req.body.outputNumber);
            const blockBuffer = await getBlock(blockNumber.toString(10));
            const block = new Block(blockBuffer);
            const txNumberInt = txNumber.toNumber();
            const proofData = block.getProofForTransactionByNumber(txNumberInt);
            if (proofData === null) {
                return res.json({error: true})
            }
            const {tx, proof} = proofData;
            // const serializedTX = ethUtil.bufferToHex(tx.serialize());
            const web3 = new Web3(config.ethNodeAddress);
            // const importedAccount = web3.eth.accounts.wallet.add(privateKey);
            // console.log(importedAccount);
            const contractDetails = await config.contractDetails();
            const acc = req.body.from;
            const PlasmaContract = new web3.eth.Contract(contractDetails.abi, contractDetails.address);
            const withdrawCollateral = await PlasmaContract.methods.WithdrawCollateral().call()
            let gas = await PlasmaContract.methods.startExit(
                blockNumber.toString(10), outputNumber.toString(10), ethUtil.bufferToHex(tx.serialize()), ethUtil.bufferToHex(proof))
                .estimateGas({from: acc, value: withdrawCollateral})
            gas = Math.floor(gas * 1.5)
            const submissionReceipt = await PlasmaContract.methods.startExit(
                blockNumber.toString(10), outputNumber.toString(10), ethUtil.bufferToHex(tx.serialize()), ethUtil.bufferToHex(proof))
                .send({from: acc, value: withdrawCollateral, gas: gas})
            return res.json({error: false, receipt: submissionReceipt})
        }
        catch(error) {
            console.log(error);
            return res.json({error: true})
        }
    })
    app.post('/startDepositExit', async function(req, res) {
        try{
            if (!validateSchema(req.body, depositExitRequestSchema).valid) {
                return res.json({error: true, reason: "invalid request"});
            }
            const depositIndex = Web3.utils.toBN(req.body.depositIndex)
            
            const web3 = new Web3(config.ethNodeAddress);
            const contractDetails = await config.contractDetails();
            const acc = req.body.from;
            const PlasmaContract = new web3.eth.Contract(contractDetails.abi, contractDetails.address);
            const collateral = await PlasmaContract.methods.DepositWithdrawCollateral().call()
            let gas = await PlasmaContract.methods.startDepositWithdraw(depositIndex.toString(10))
                .estimateGas({from: acc, value: collateral})
            gas = Math.floor(gas * 1.5)
            const submissionReceipt = await PlasmaContract.methods.startDepositWithdraw(depositIndex.toString(10)).
                send({from: acc, value: collateral, gas: gas})
            return res.json({error: false, receipt: submissionReceipt})
        }
        catch(error) {
            console.log(error);
            return res.json({error: true})
        }
    })
    app.post('/deposit', async function(req, res) {
        try{
            if (!validateSchema(req.body, depositRequestSchema).valid) {
                return res.json({error: true, reason: "invalid request"});
            }
            const amount = Web3.utils.toBN(req.body.amount)
            // const privateKey = req.body.privateKey;
            const web3 = new Web3(config.ethNodeAddress);
            // const importedAccount = web3.eth.accounts.wallet.add(privateKey);
            // console.log(importedAccount);
            const contractDetails = await config.contractDetails();
            const acc = req.body.for;
            const PlasmaContract = new web3.eth.Contract(contractDetails.abi, contractDetails.address);
            let gas = await PlasmaContract.methods.deposit().estimateGas({from: acc, value: amount})
            gas = Math.floor(gas * 1.5)
            const submissionReceipt = await PlasmaContract.methods.deposit()
                .send({from: acc, value: amount, gas: gas})
            return res.json({error: false, receipt: submissionReceipt})
        }
        catch(error) {
            console.log(error);
            return res.json({error: true})
        }
    })
    // app.post('/sendTX', async function(req, res) {
    //     try{
    //         const privateKey = ethUtil.toBuffer(req.body.privateKey)
    //         const tx = createTransaction(1, req.body.inputs, req.body.outputs, privateKey)
    //         const txHex = ethUtil.bufferToHex(tx.serialize())
    //         const receipt = await sendTransaction(txHex, "127.0.0.1:3001")
    //         return res.json({receipt})
    //     }
    //     catch(error) {
    //         console.log(error);
    //         return res.json({error: true})
    //     }
    // })
    app.post('/sendTX', async function(req, res) {
        try{
            const from = req.body.from
            const crypto = require('crypto');
            const emptyPK = crypto.randomBytes(32)
            const tx = createTransaction(1, req.body.inputs, req.body.outputs, emptyPK)
            const toSign = ethUtil.bufferToHex(tx.transaction.serialize())
            const web3 = new Web3(config.ethNodeAddress);
            const signature = await web3.eth.sign(toSign, from)
            tx.serializeSignature(signature)
            const txHex = ethUtil.bufferToHex(tx.serialize())
            const receipt = await sendTransaction(txHex, config.txProcessorEndpoint)
            return res.json({receipt})
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