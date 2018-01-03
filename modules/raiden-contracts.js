/**
 * @file Sets up interfaces for all constant methods provided by the Raiden contracts.
 * @author Ben Edgington
 */

/* Usage
var Contracts = require('./modules/raiden-contracts.js');
var contracts = new Contracts('http://127.0.0.1:8545');
var token = new contracts.interface('0x02cAf13e4b645b3dBf27f6Ae1647356A2410210F', 'abis/Token.json');
token.name().then(console.log);
*/

"use strict";

const Web3 = require('web3');
const path = require('path');
const ContractConstructor = require('./contract-constructor.js');

module.exports = RaidenContracts;

/**
 * Sets up interfaces for all constant methods provided by the Raiden contracts.
 * @param {string} host - The Ethereum node RPC, e.g. 'http://127.0.0.1:8545'.
 * @constructor
 */
function RaidenContracts(host) {

    // Doing it this way means that we can share a single Web3 object between
    // all the different contracts.
    this.web3 = new Web3(host);

    // the interface method becomes a constructor for the contract interface.
    this.interface = new ContractConstructor(this.web3);
}
