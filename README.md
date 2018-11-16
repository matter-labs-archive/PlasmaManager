# PlasmaManager
[![Build Status](https://travis-ci.com/matterinc/PlasmaManager.svg?branch=master)](https://travis-ci.com/matterinc/PlasmaManager)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**PlasmaManager** is your toolbelt for any kind of interactions with More Viable Plasma by Matter.

  * [Features](#features)
  * [Design Decisions](#design-decisions)
  * [Requirements](#requirements)
  * [Communication](#communication)
  * [Transaction Structure](#transaction-structure) 
    + [Input](#input)
    + [Output](#output)
    + [Transaction](#transaction)
    + [Signed Transaction](#signed-transaction)
  * [Block Structure](#block-structure) 
    + [Block](#block)
    + [Block Header](#block-header)
  * [Credits](#credits)
    + [Security Disclosure](#security-disclosure)
  * [Donations](#donations)
  * [License](#license)

---
  - [Usage Doc](https://github.com/matterinc/PlasmaManager/blob/master/Documentation/Usage.md)
	- **Transaction** 
		- [Form input](https://github.com/matterinc/PlasmaManager/blob/master/Documentation/Usage.md#form-input)
		- [Form output](https://github.com/matterinc/PlasmaManager/blob/master/Documentation/Usage.md#form-output)
		- [Form transaction, sign it and serialize](https://github.com/matterinc/PlasmaManager/blob/master/Documentation/Usage.md#form-transaction-sign-it-and-serialize)
	- **UTXOs listing** 
		- [Get UTXOs list for Ethereum address](https://github.com/matterinc/PlasmaManager/blob/master/Documentation/Usage.md#get-utxos-list-for-ethereum-address)
	- **Send transaction in Plasma** 
		- [Send raw transaction](https://github.com/matterinc/PlasmaManager/blob/master/Documentation/Usage.md#send-raw-transaction)	
    - **Blocks**  
        - [Get last written Block and its number](https://github.com/matterinc/PlasmaManager/blob/master/Documentation/Usage.md#get-last-written-block-and-its-number)
        - [Get block hash from storage and from Plasma Contract](https://github.com/matterinc/PlasmaManager/blob/master/Documentation/Usage.md#get-block-hash-from-storage-and-from-plasma-contract)
        - [Parse Block by its number](https://github.com/matterinc/PlasmaManager/blob/master/Documentation/Usage.md#parse-block-by-its-number)
        - [Get transactions list from Block and add some checks for it](https://github.com/matterinc/PlasmaManager/blob/master/Documentation/Usage.md#get-transactions-list-from-block-and-add-some-checks-for-it)
     - **Send transaction in Plasma**
        - [Send raw serialized transaction](https://github.com/matterinc/PlasmaManager/blob/master/Documentation/Usage.md#send-raw-serialized-transaction)
     - **Send transaction to Plasma Contract**
        - [Put deposit](https://github.com/matterinc/PlasmaManager/blob/master/Documentation/Usage.md#put-deposit)
        - [Withdraw for chosen block number and serialized transaction](https://github.com/matterinc/PlasmaManager/blob/master/Documentation/Usage.md#withdraw-for-chosen-block-number-and-serialized-transaction)

## Features

- [x] Based on [More Viable Plasma Implementation](https://github.com/matterinc/PlasmaContract) by The Matter Team
- [x] RLP encoding and decoding based on [NPM Plasma Module](https://github.com/matterinc/plasma.js) 
- [x] Manages interaction with a block producer and the smart-contract
- [x] Comprehensive Test Coverage
- [x] [Complete Documentation](https://matterinc.github.io/PlasmaManager)

## Design Decisions

- Functionality was focused on serializing and signing transactions locally
- Sending raw transactions to The Matter Plasma network using REST API
- Sending raw transactions to Plasma Contract using [web3.js](https://github.com/ethereum/web3.js)

## Communication

When using this lib, please make references to this repo and give your start! :)
*Nothing makes developers happier than seeing someone else use our work and go wild with it.*

If you are using PlasmaManager in your project or know of an project that uses it, please add it to [this list](https://github.com/matterinc/PlasmaManager/wiki/Projects-using-PlasmaSwiftLib).

- If you **need help**, use [Stack Overflow](https://stackoverflow.com/questions/tagged/PlasmaManager) and tag `PlasmaManager`.
- If you need to **find or understand an API**, check [our documentation](http://matterinc.github.io/PlasmaManager/).
- If you'd like to **see PlasmaManager best practices**, check [Projects using this library](https://github.com/matterinc/PlasmaManager/wiki/Projects-using-PlasmaSwiftLib).
- If you **found a bug**, [open an issue](https://github.com/matterinc/PlasmaManager/issues).
- If you **have a feature request**, [open an issue](https://github.com/matterinc/PlasmaManager/issues).
- If you **want to contribute**, [submit a pull request](https://github.com/matterinc/PlasmaManager/pulls).

## Transaction structure

The transaction structure, that is used in The Matter Plasma Implementation is the UTXO model with explicit enumeration of UTXOs in the inputs.

### Input
An RLP encoded set with the following items:
- Block number, 4 bytes
- Transaction number in block, 4 bytes
- Output number in transaction, 1 byte
- "Amount" field, 32 bytes, that is more a data field, usually used for an amount of the output referenced by previous field, but has special meaning for "Deposit" transactions

### Output
An RLP encoded set with the following items:
- Output number in transaction, 1 byte
- Receiver's Ethereum address, 20 bytes
- "Amount" field, 32 bytes

### Transaction 
An RLP encoded set with the following items:
- Transaction type, 1 byte
- An array (list) of Inputs, maximum 2 items
- An array (list) of Outputs, maximum 3 items. One of the outputs is an explicit output to an address of Plasma operator.

### Signed transaction 
An RLP encoded set with the following items:
- Transaction, as described above
- Recoverable EC of the transaction sender:
   1) V value, 1 byte, expected values 27, 28
   2) R value, 32 bytes
   3) S value, 32 bytes

From this signature Plasma operator deduces a sender, checks that the sender is an owner of UTXOs referenced by inputs. Signature is based on EthereumPersonalHash(RLPEncode(Transaction)). Transaction should be well-formed, sum of inputs equal to sum of the outputs, etc.

## Block structure

### Block header
- Block number, 4 bytes, used in the main chain to double check proper ordering
- Number of transactions in block, 4 bytes, purely informational
- Parent hash, 32 bytes, hash of the previous block, hashes the full header
- Merkle root of the transactions tree, 32 bytes
- V value, 1 byte, expected values 27, 28
- R value, 32 bytes
- S value, 32 bytes

Signature is based on EthereumPersonalHash(block number || number of transactions || previous hash || merkle root), where || means concatenation. Values V, R, S are then concatenated to the header.

### Block
- Block header, as described above, 137 bytes
- RLP encoded array (list) of signed transactions, as described above

While some fields can be excessive, such block header can be submitted by anyone to the main Ethereum chain when block is available, but for some reason not sent to the smart contract. Transaction numbering is done by the operator, it should be monotonically increasing without spaces and number of transactions in header should (although this is not necessary for the functionality) match the number of transactions in the Merkle tree and the full block.

## Credits

Alex Vlasov, [@shamatar](https://github.com/shamatar),  alex.m.vlasov@gmail.com

### Security Disclosure

If you believe you have identified a security vulnerability with PlasmaSwiftLib, you should report it as soon as possible via email to [Alex Vlasov](https://github.com/shamatar)  alex.m.vlasov@gmail.com. Please do not post it to a public issue tracker.

## Donations

[The Matters](https://github.com/orgs/matterinc/people) are charged with open-sorсe and do not require money for using their PlasmaManager.
We want to continue to do everything we can to move the needle forward.
If you use any of our libraries for work, see if your employers would be interested in donating. Any amount you can donate today to help us reach our goal would be greatly appreciated.

Our Ether wallet address: 0xe22b8979739d724343bd002f9f432f5990879901

![Donate](http://qrcoder.ru/code/?0xe22b8979739d724343bd002f9f432f5990879901&4&0)

## License

PlasmaManager is available under the Apache License 2.0 license. See the [LICENSE](https://github.com/matterinc/PlasmaManager/blob/master/LICENSE) for details.
