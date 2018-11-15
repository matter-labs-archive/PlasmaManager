# Usage

## Transaction

#### Form input

```js
const am = "1000000000000000000"
const inputs = [{blockNumber: 1, txNumberInBlock: 0, outputNumberInTransaction: 0, 
    amount: am // 1 ETH
}];
```

#### Form output

```js
const am = "1000000000000000000"
const outputs = [{to: toAddress, amount: am}]
```

#### Form transaction, sign it and serialize

```js
const {createTransaction} = require("../PlasmaManager/functions/createTransaction");

const txType = 1; // null = 0; split = 1; merge = 2; fund = 3;
const transaction = createTransaction(txType, inputs, outputs, fromPrivateKey);
const serializedTX = transaction.serialize()
```

## UTXOs listing

#### Get UTXOs list for Ethereum address

```js
const {getUTXOlist} = require("../PlasmaManager/functions/getUTXOlist");

let list = await getUTXOlist(fromAddress, "127.0.0.1:3001")
assert(list.utxos.length === 0);
```

## Send transaction in Plasma

#### Send raw transaction
```js
const {sendTransaction} = require("../PlasmaManager/functions/sendTransaction");
const ethUtil = require("ethereumjs-util");

const sendingResult = await sendTransaction(ethUtil.bufferToHex(serializedTX), "127.0.0.1:3001")
assert(sendingResult.error === false);
```
