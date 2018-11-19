# Usage

<***> - input object

Plasma is working on Mainnet and Rinkeby testnet.

## UTXO

#### UTXO structure

- blockNumber: Int
- transactionNumber: Int
- outputNumber: Int
- value: String

#### Get UTXOs list for Ethereum address

```js
const {getUTXOlist} = require("../PlasmaManager/functions/getUTXOlist");

let list = await getUTXOlist(<fromAddress>, "127.0.0.1:3001")
assert(list.utxos.length === 0);
```

## Transaction

#### Form input

```js
const am = "1000000000000000000"
const inputs = [{blockNumber: <blockNumber>, txNumberInBlock: <txNumberInBlock>, outputNumberInTransaction: <outputNumberInTransaction>, 
    amount: am // 1 ETH
}];
```

#### Form output

```js
const am = "1000000000000000000" // 1 ETH
const outputs = [{to: <toAddress>, amount: am}]
```

#### Form transaction, sign it and serialize

*Transaction types:*
- split - use to send funds
- merge - use to merge UTXOs
- fund
- null

*When sending funds:*
- 2 outputs:
    ```js
        let allOutputs = [];
        const output1 = {outputNumberInTx: 0, to: <destination address>, amount: <sending amount>}
        const output2 = {outputNumberInTx: 1, to: <current address>, amount: <stay amount>}
        allOutputs.push(out);
    ```
- 1 input:
    - form inputs array from 1 UTXO using toTransactionInput():
    ```js
        let allInputs = [];
        const input = {blockNumber: <utxo>.blockNumber, txNumberInBlock: <utxo>.transactionNumber, outputNumberInTransaction: <utxo>.outputNumber, amount: <utxo>.value};
        allInputs.push(input);
    ```
    
*When merging UTXOs:*
- 2 inputs:
    - form input array from 2 UTXOs:
    ```js
        let allInputs = [];
    	let mergedAmount = new BN();
        for (const utxo of <utxos>) {
          mergedAmount.iadd(new BN(utxo.value));
          const input = {blockNumber: utxo.blockNumber, txNumberInBlock: utxo.transactionNumber, outputNumberInTransaction: utxo.outputNumber, amount: utxo.value};
          allInputs.push(input);
        }
    ```
- 1 output:
    ```js
        let allOutputs = [];
        const output = [{to: <address>, amount: mergedAmount}]
        allOutputs.push(out);
    ```

*Example:*
```js
const {createTransaction} = require("../PlasmaManager/functions/createTransaction");

const txType = 1; // null = 0; split = 1; merge = 2; fund = 3;
const transaction = createTransaction(txType, <inputs>, <outputs>, <fromPrivateKey>);
const serializedTX = transaction.serialize()
```

## Blocks

#### Get last written block and its number

```js
const {getLastWrittenBlock} = require("../PlasmaManager/functions/getLastWrittenBlock");

const lastWrittenBlock = await getLastWrittenBlock("127.0.0.1:3001")
const plasmaBlockNumber = lastWrittenBlock.blockNumber
```

#### Get block hash from storage and from Plasma Contract

```js
let storage = require('../PlasmaManager/blockstorage/digitalOceanStorage');
const {getBlockHash} = require("../PlasmaManager/functions/getBlockHash");
const assert = require("assert")
const ethUtil = require('ethereumjs-util');
const Web3 = require('web3');
const web3 = new Web3(config.ethNodeAddress);
web3.eth.accounts.wallet.add(ethUtil.bufferToHex(<fromPrivateKey>));
const PlasmaContract = new web3.eth.Contract(<PlasmaContractABI>, <PlasmaContractAddress>, {from: <fromAddress>});

const BlockHeaderLength = 137
let hash = await getBlockHash(<plasmaBlockNumber>, storage, BlockHeaderLength);
const hash = await PlasmaContract.methods.hashOfLastSubmittedBlock().call();
let hashFromContract = ethUtil.toBuffer(hash);
assert(hash.equals(hashFromContract));
```

#### Parse Block by its number

```js
const {Block} = require("../PlasmaManager/lib/Block/RLPblock");

let parsedBlock = new Block(serializedBlock);
```

#### Get transactions list from Block and add some checks for it

```js
const assert = require("assert")
const ethUtil = require('ethereumjs-util');

let transcations = <parsedBlock>.transactions
assert(parsedBlock.transactions.length === 1);
assert(ethUtil.bufferToHex(parsedBlock.transactions[0].transaction.outputs[0].recipient) == <RecipientKnownAddress>);
```

## Send transaction in Plasma

#### Send raw serialized transaction
```js
const assert = require("assert")
const {sendTransaction} = require("../PlasmaManager/functions/sendTransaction");
const ethUtil = require("ethereumjs-util");

const sendingResult = await sendTransaction(ethUtil.bufferToHex(<serializedTX>), "127.0.0.1:3001")
assert(sendingResult.error === false);
```

## Send transaction to Plasma Contract

There are 3 preset Plasma Contract methods you can use in this lib:
- deposit
- WithdrawCollateral
- startExit

`WithdrawCollateral` and `startExit` are used in one action - withdraw funds from Plasma UTXO/

You can also use any other Plasma Contract method by learning its ABI.

#### Put deposit
```js
const assert = require("assert")
const ethUtil = require('ethereumjs-util');
const Web3 = require('web3');
const web3 = new Web3(config.ethNodeAddress);
web3.eth.accounts.wallet.add(ethUtil.bufferToHex(<fromPrivateKey>));
const PlasmaContract = new web3.eth.Contract(<PlasmaContractABI>, <PlasmaContractAddress>, {from: <fromAddress>});

const allAccounts = await web3.eth.getAccounts();
const account = allAccounts[1]
assert(account.toLowerCase() === <fromAddress>.toLowerCase())
const oneETH = Web3.utils.toWei("1", "ether");
console.log("Depositing 1 ETH for " + account);
let gas = await PlasmaContract.methods.deposit().estimateGas({from: account, value: oneETH})
console.log("Deposit gas price is " + gas);
gas = 200000
const result = await PlasmaContract.methods.deposit().send({from: account, value: oneETH, gas: gas})
```

#### Withdraw for chosen block number and serialized transaction

```js
const assert = require("assert")
const ethUtil = require('ethereumjs-util');
const Web3 = require('web3');
const web3 = new Web3(config.ethNodeAddress);
web3.eth.accounts.wallet.add(ethUtil.bufferToHex(<fromPrivateKey>));
const PlasmaContract = new web3.eth.Contract(<PlasmaContractABI>, <PlasmaContractAddress>, {from: <fromAddress>});

const plasmaBlockNumber = <blockNumber> // uint32
const outputNumber = 0 // uint8
const transactionHex = <serializedTX> // bytes
const proofHex = binaryProof // bytes
const parsedBlock = <parsedBlock>

let proof = parsedBlock.getProofForTransaction(transactionHex);
assert(proof !== null);
let binaryProof = proof.proof;

const allAccounts = await web3.eth.getAccounts();
const account = allAccounts[1]
assert(account.toLowerCase() === toAddress.toLowerCase())
console.log("Starting exit for " + account);
const exitCollateral = await PlasmaContract.methods.WithdrawCollateral().call();
const transactionHex = ethUtil.bufferToHex(transaction);
const proofHex = ethUtil.bufferToHex(proof);
let gas = await PlasmaContract.methods.startExit(plasmaBlockNumber, outputNumber, transactionHex, proofHex).estimateGas({from: account, value: exitCollateral})
console.log("Starting exit gas price is " + gas);
gas = 1000000
const result = await PlasmaContract.methods.startExit(blockNumber, outputNumber, transactionHex, proofHex).send({from: account, value: exitCollateral, gas: gas})
```
