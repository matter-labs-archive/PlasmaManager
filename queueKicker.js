const config = require('./config');
const ethUtil = require('ethereumjs-util');
const Web3 = require('web3');
const interval = 60*1000; // 1 minute
let itemsToPop = 10;

async function main() {
    const contractDetails = await config.contractDetails();
    console.log("Connecting to the node " + config.ethNodeAddress)
    const web3 = new Web3(config.ethNodeAddress);
    const PlasmaContract = new web3.eth.Contract(contractDetails.abi, contractDetails.address);
    const importedWallet = web3.eth.accounts.wallet.add(config.blockSenderKey);
    console.log("Imported account " + importedWallet.address);
    const importedAddress = importedWallet.address;
    setTimeout(popTheQueue, 1000)

    async function popTheQueue() {
        try{ 
            console.log("Trying to pop items from priority queue")
            const allAccounts = await web3.eth.getAccounts();
            console.log("Available accounts " + JSON.stringify(allAccounts));
            let from = allAccounts[0];
            if (from === undefined || from === "") {
                from = importedAddress
            }
            let gasEstimate = await PlasmaContract.methods.finalizeExits(itemsToPop).estimateGas({from: from})
            console.log("Looks like there are matured exits in queue");
            console.log("Gas estimate is " + gasEstimate)
            gasEstimate = Math.floor(gasEstimate * 15 / 10)
			    await PlasmaContract.methods.finalizeExits(itemsToPop).send({from: from, gas: gasEstimate})
            setTimeout(popTheQueue, interval);
        }
        catch (err) {
            console.log("Looks like the queue is empty");
            console.log(err);
            setTimeout(popTheQueue, interval);
        }
    }
		
}
main().catch(err => { console.log(err); process.exit(1); });