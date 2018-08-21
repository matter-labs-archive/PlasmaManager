const config = require('./config');
var storage;
if (config.debug) {
	storage = require('./blockstorage/localBlockStorage');
} else {
	storage = require('./blockstorage/digitalOceanStorage');
}
const ethUtil = require("ethereumjs-util");
const Web3 = require("web3");
const BN = Web3.utils.BN;
const TruffleContract = require('truffle-contract');
const web3 = new Web3(config.ethNodeAddress);
const PlasmaContractModel = TruffleContract(require("./contracts/build/contracts/PlasmaParent.json"));
const PlasmaContract = new web3.eth.Contract(PlasmaContractModel.abi, config.contractAddress, {from: config.fromAddress, gas: 150000});

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

const Block = require("./lib/Block/RLPblock");

const requestSchema =
{
    "withdrawIndex" : {"type": "string", "minLength": 1, "maxLength": 64},
    "blockNumber" : {"type": "string", "minLength": 1, "maxLength": 64},
    "spendingTransaction" : {"type": "string", "minLength": 3, "maxLength": 5000},
    "required": ["withdrawIndex", "blockNumber", "spendingTransaction"]
}

const depositRequestSchema =
{
    "depositIndex" : {"type": "string", "minLength": 1, "maxLength": 64},
    "blockNumber" : {"type": "string", "minLength": 1, "maxLength": 64},
    "spendingTransaction" : {"type": "string", "minLength": 3, "maxLength": 5000},
    "required": ["depositIndex", "blockNumber", "spendingTransaction"]
}

const ONE = new BN(1);
const divisor = ONE.ushln(128);

const getBlock = storage.getBlock;
// const {getBlock} = require("./testScripts/getBlock")


function main() {
    app.post('/sendExitChallenge', async function(req, res) {
        try{
            if (!validateSchema(req.body, requestSchema).valid) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            const withdrawIndex = Web3.utils.toBN(req.body.withdrawIndex);
            const txnum = withdrawIndex.umod(divisor);
            const blockNumber = Web3.utils.toBN(req.body.blockNumber)
            console.log("Transaction with index " + withdrawIndex.toString(10) + " was spent in block " + blockNumber.toString());
            const blockBuffer = await getBlock(req.body.blockNumber);
            const block = new Block(blockBuffer);
            const transactionBuffer = ethUtil.toBuffer(req.body.spendingTransaction);
            const found = block.getProofForTransactionSpendingUTXO(transactionBuffer, withdrawIndex);
            if (found === null) {
                return res.json({error: true})
            }
            const {tx, proof, inputNumber} = found;
            console.log(JSON.stringify(tx.toFullJSON(true)));
            console.log("Challenging withdraw index " + withdrawIndex.toString(10));
            console.log("It was spent in block " + blockNumber.toString(10));
            console.log("In the input number " + inputNumber.toString(10));
            console.log("In transaction " + ethUtil.bufferToHex(tx.serialize()));
            console.log("Here is a proof " + ethUtil.bufferToHex(proof));
            const gas = await PlasmaContract.methods.challengeWithdraw(blockNumber,
                inputNumber,
                ethUtil.bufferToHex(tx.serialize()),
                ethUtil.bufferToHex(proof),
                withdrawIndex
            ).estimateGas();
            console.log("Challenge required " + gas + " gas");
            PlasmaContract.methods.challengeWithdraw(blockNumber,
                inputNumber,
                ethUtil.bufferToHex(tx.serialize()),
                ethUtil.bufferToHex(proof),
                withdrawIndex
                ).send()
                .on("transactionHash", (hash) => {
                    return res.json({error: false, hash})
                })
                .on("error", (error) => {
                    return res.json({error: true})
                })
        }
        catch(error) {
            console.log(error);
            return res.json({error: true})
        }
    })

    app.post('/sendDepositChallenge', async function(req, res) {
        try{
            if (!validateSchema(req.body, depositRequestSchema).valid) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            const depositIndex = Web3.utils.toBN(req.body.depositIndex);
            const blockNumber = Web3.utils.toBN(req.body.blockNumber)
            console.log("Transaction with index " + depositIndex.toString(10) + " was included in block " + blockNumber.toString());
            const blockBuffer = await getBlock(req.body.blockNumber);
            const block = new Block(blockBuffer);
            const transactionBuffer = ethUtil.toBuffer(req.body.spendingTransaction);
            const found = block.getProofForTransaction(transactionBuffer);
            if (found === null) {
                return res.json({error: true})
            }
            const {tx, proof} = found;
            console.log(JSON.stringify(tx.toFullJSON(true)));
            console.log("Challenging deposit index " + depositIndex.toString(10));
            console.log("It was deposited in block " + blockNumber.toString(10));
            console.log("In transaction " + ethUtil.bufferToHex(tx.serialize()));
            console.log("Here is a proof " + ethUtil.bufferToHex(proof));
            const gas = await PlasmaContract.methods.challengeDepositWithdraw(depositIndex,
                blockNumber,
                ethUtil.bufferToHex(tx.serialize()),
                ethUtil.bufferToHex(proof)
            ).estimateGas();
            console.log("Challenge required " + gas + " gas");
            PlasmaContract.methods.challengeDepositWithdraw(depositIndex,
                blockNumber,
                ethUtil.bufferToHex(tx.serialize()),
                ethUtil.bufferToHex(proof)
            ).send()
                .on("transactionHash", (hash) => {
                    return res.json({error: false, hash})
                })
                .on("error", (error) => {
                    return res.json({error: true})
                })
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