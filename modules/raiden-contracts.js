/**
 * @file Sets up interfaces for all constant methods provided by the Raiden contracts.
 * @author Ben Edgington
 */

/* Usage
var Contracts = require('./modules/raiden-contracts.js');
var contracts = new Contracts('http://127.0.0.1:8545');
var token = new contracts.Token('0x02cAf13e4b645b3dBf27f6Ae1647356A2410210F');
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

    this.web3 = new Web3(host);

    // This is hard-coded - so lazy...
    //var abi_dir = path.join(__dirname,'abi/')
    var abi_dir = 'abis/';

    this.Token =
        new ContractConstructor(
            path.join(abi_dir, 'Token.json'),
            this.web3
        );

    this.Discovery =
        new ContractConstructor(
            path.join(abi_dir, 'EndpointRegistry.json'),
            this.web3
        );

    this.Registry =
        new ContractConstructor(
            path.join(abi_dir, 'Registry.json'),
            this.web3
        );

    this.ChannelManager =
        new ContractConstructor(
            path.join(abi_dir, 'ChannelManagerContract.json'),
            this.web3
        );

    this.NettingChannel =
        new ContractConstructor(
            path.join(abi_dir, 'NettingChannelContract.json'),
            this.web3
        );
}
