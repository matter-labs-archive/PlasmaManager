const {Block} = require("../lib/Block/RLPblock");
const ResendDelay = 60*60*5 // 5 hours
const ethUtil = require("ethereumjs-util");

async function processDepositExitChallengeFromQueue(eventName, mq, plasmaContract, storage, web3) {
    let msg = await mq.receiveMessage({qname: `eventchallenge-${eventName}`});
    if (!msg.id) {
        return null
    }
    const mess = JSON.parse(msg.message);
    if (mess.hash === undefined) {
        const res = await processToSend(mess, plasmaContract, storage, web3)
        if (res !== null) {
            if (res.ok) {
                await mq.deleteMessage({qname: `eventchallenge-${eventName}`, id: msg.id})
                return null
            }
            await mq.sendMessage({qname: `eventchallenge-${eventName}`, message: JSON.stringify(res)});
            await mq.deleteMessage({qname: `eventchallenge-${eventName}`, id: msg.id})
            return null
        } else {
            return null
        }
    } else {
        const res = await processToCheck(mess, plasmaContract, web3)
        if (res === null) {
            return null
        } if (res.ok === true) {
            await mq.deleteMessage({qname: `eventchallenge-${eventName}`, id: msg.id})
            return null
        } else if (res.resend === true) {
            let copy = res
            delete res.resend
            delete res.hash
            delete res.timestamp
            await mq.sendMessage({qname: `eventchallenge-${eventName}`, message: JSON.stringify(copy)});
            await mq.deleteMessage({qname: `eventchallenge-${eventName}`, id: msg.id})
            return null
        } else {
            return null
        }
    }
}

async function processToSend(message, plasmaContract, storage, web3) {
    return new Promise(async (resolve, reject) => {
        try {
            const {event, challenge} = message;
            //
            // BlockForChallenge       string `json:"blockForChallenge,omitempty"`
            // TransactionForChallenge string `json:"transactionForChallenge,omitempty"`
            const spentInBlock = challenge.blockForChallenge;
            const spentInTx = challenge.transactionForChallenge;

            const previousTransactionParameters = message.previousTransactionParameters;
            
            // event DepositWithdrawStartedEvent(uint256 indexed _depositIndex)
            const depositIndex = event._depositIndex;

            const blockBytes = await storage.getBlock(spentInBlock);
            const block = new Block(blockBytes);

            const proofObject = block.getProofForTransactionByNumber(Number.parseInt(spentInTx));
            const {proof, tx} = proofObject;

            console.log("Challenging deposit exit " + depositIndex);
            console.log("It was processed in block " + spentInBlock);
            console.log("In transaction number " + spentInTx);
            console.log("In transaction " + ethUtil.bufferToHex(tx.serialize()));
            console.log("Here is a proof " + ethUtil.bufferToHex(proof));

            console.log("Check if already challenged")

            const depositRecord = await plasmaContract.methods.depositRecords(depositIndex).call();
            // uint8 constant DepositStatusDepositConfirmed = 4; // a transaction with a deposit was posted

            // struct DepositRecord {
            //     address from;
            //     uint8 status;
            //     bool hasCollateral;
            //     uint256 amount;
            //     uint256 withdrawStartedAt;
            // }
            if (depositRecord[0] === "0x0000000000000000000000000000000000000000") {
                resolve(null)
                return
            }
            const alreadyChallenged = depositRecord[1] == "4";

            // now check if there is a transaction to kick out from the mempool

            if (previousTransactionParameters !== undefined) {
                const {account, nonce, abiData, gasPrice, gas, contractAddress} = previousTransactionParameters;
                if (alreadyChallenged) {
                    // we need to kick this one out from the mempool, so next challgenges can proceed
                    // on the other side if this one is underpriced, than all the next ones are underpriced,
                    // so we do nothing and allow the next ones to fail
                    resolve({ok: true})
                    return
                }
                const oldGasPrice = web3.utils.toBN(gasPrice);
                let newGasPrice = await web3.eth.getGasPrice();
                newGasPrice = web3.utils.toBN(newGasPrice).mul((new web3.utils.BN(12))).div((new web3.utils.BN(10)))
                if (oldGasPrice.gte(newGasPrice)) {
                    newGasPrice = oldGasPrice.mul((new web3.utils.BN(12))).div((new web3.utils.BN(10)))
                }
                console.log("Using gas price " + newGasPrice.toString(10))

                web3.eth.sendTransaction({
                    from: account,
                    to: contractAddress,
                    gas: gas,
                    gasPrice: newGasPrice,
                    data: abiData,
                    nonce: nonce
                }).on("transactionHash", (hash) => {
                    const now = Math.floor((new Date()).getTime() / 1000);
                    const copy = message;
                    const transactionParameters = {
                        account: account,
                        nonce: nonce,
                        gasPrice: newGasPrice.toString(10),
                        gas: gas,
                        contractAddress: contractAddress,
                        abiData: abiData
                    }
                    copy.hash = hash;
                    copy.timestamp = now;
                    copy.previousTransactionParameters = transactionParameters;
                    resolve(copy);
                    return
                })
                    .on("error", (error) => {
                        console.log("Error sending a challenge")
                        console.log(error)
                        resolve(null);
                        return
                    })

            } else if (alreadyChallenged) {
                resolve({ok: true});
                return
            } else {
                const allAccounts = await web3.eth.getAccounts();
                const numAccounts = allAccounts.length;
                let account = ""
                if (numAccounts !== 0) {
                    const randomAccountNumber = Math.floor(Math.random() * numAccounts); // random between 0 and numAccounts - 1
                    account = allAccounts[randomAccountNumber];
                } else {
                    const numWallets = web3.eth.accounts.wallet.length;
                    const randomAccountNumber = Math.floor(Math.random() * numWallets);
                    account = web3.eth.accounts.wallet[randomAccountNumber].address;
                }
                // and get the nonce manually 
                const nonce = await web3.eth.getTransactionCount(account, "pending")
                let gas = await plasmaContract.methods.challengeDepositWithdraw(
                    depositIndex,
                    spentInBlock,
                    ethUtil.bufferToHex(tx.serialize()),
                    ethUtil.bufferToHex(proof),
                ).estimateGas({from:account});
                console.log("Challenge required " + gas + " gas");
                gas = Math.floor(gas * 1.5)
                let gasPrice = await web3.eth.getGasPrice();
                gasPrice = web3.utils.toBN(gasPrice).mul((new web3.utils.BN(12))).div((new web3.utils.BN(10)))
                console.log("Using gas price " + gasPrice.toString(10))

                // Just encode the data to have more flexibility on sending a transaction
                const abiData = plasmaContract.methods.challengeDepositWithdraw(
                    depositIndex,
                    spentInBlock,
                    ethUtil.bufferToHex(tx.serialize()),
                    ethUtil.bufferToHex(proof),
                ).encodeABI()
                    
                const contractAddress = plasmaContract.options.address;

                // send the manually formed transaction that is effectively the same as doing the contract call commented below
                web3.eth.sendTransaction({
                    from: account,
                    to: contractAddress,
                    gas: gas,
                    gasPrice: gasPrice,
                    data: abiData,
                    nonce: nonce
                }).on("transactionHash", (hash) => {
                    const now = Math.floor((new Date()).getTime() / 1000);
                    const copy = message;
                    const transactionParameters = {
                        account: account,
                        nonce: nonce,
                        gasPrice: gasPrice.toString(10),
                        gas: gas,
                        contractAddress: contractAddress,
                        abiData: abiData
                    }
                    copy.hash = hash;
                    copy.timestamp = now;
                    copy.previousTransactionParameters = transactionParameters;
                    resolve(copy)
                    return
                })
                    .on("error", (error) => {
                        console.log("Error sending a challenge")
                        console.log(error)
                        resolve(null)
                        return
                    })
            }
        } catch(err) {
            console.log(err);
            resolve(null)
            return
        }
    });
}

async function processToCheck(message, plasmaContract, web3) {
    try {
        const {event, challenge} = message;
        const transactionHash = message.hash
        const sendingTimestamp = message.timestamp
        const previousTransactionParameters = message.previousTransactionParameters;

        now = Math.floor((new Date()).getTime() / 1000);

        let alreadyChallenged = false
        const depositIndex = event._depositIndex;
    
        console.log("Check if already challenged")

        const depositRecord = await plasmaContract.methods.depositRecords(depositIndex).call();
        alreadyChallenged = depositRecord[1] == "4";

        console.log("Checking for inclusion of our challenge")

        const challengeReceipt = await web3.eth.getTransactionReceipt(transactionHash);
        if (challengeReceipt === null) {
            console.log("Transaction is pending")
            if (alreadyChallenged) {
                console.log("Someone has already challenged a tx")
                return {ok: true}
            }
            if (now - sendingTimestamp > ResendDelay) {
                console.log("Timeout exceeded")
                const copy = message;
                copy.resend = true;
                return copy;
            }
        }

        if (challengeReceipt.status === true) {
            if (alreadyChallenged) {
                return {ok: true}
            } else {
                // should never happen
                console.log("Challenge was included in the block, did not fail, but exit is still pending")
            }
        } else {
            console.log("Transaction has reverted")
            if (alreadyChallenged) {
                return {ok: true}
            } else {
                console.log("Should resend without old transaction parameters")
                const copy = message;
                delete copy.previousTransactionParameters;
                copy.resend = true;
                return copy;
            }
        }
    } catch(err) {
        console.log(err);
        return null
    }
}

module.exports = {processDepositExitChallengeFromQueue}