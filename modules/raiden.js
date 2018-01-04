/**
 * @file A class for creating interfaces to Raiden node RPC.
 * @author Ben Edgington
 */

"use strict";

const doRequest = require('./raiden-rpc.js');
const Channels = require('./raiden-channels.js');
const Tokens = require('./raiden-tokens.js');
const Events = require('./raiden-events.js');

module.exports = Raiden;

/**
 * The Raiden class
 * @param {string} host - The Raiden node RPC, e.g. 'http://127.0.0.1:5001'.
 * @constructor
 */
function Raiden(host) {
    this.host = host;
    this.channels = new Channels(host);
    this.tokens = new Tokens(host);
    this.events = new Events(host);
}

// =====================================================================
// Top-level methods on Raiden

// ---------------------------------------------------------------------
// Read-only methods

/**
 * Get the Ethereum account address associated with the node.
 * @returns {Promise} Resolves to the (Ethereum) address of the Raiden node we are connected to.
 */
Raiden.prototype.address = function() {
    return doRequest('GET', this.host + '/api/1/address');
}

// ---------------------------------------------------------------------
// State-changing methods

/**
 * Transfer a token within a channel
 * @param {string} token - The token address.
 * @param {string} target - The address of the recipient.
 * @param {number} amount - Number of tokens to be transferred.
 * @returns {Promise}
 */
Raiden.prototype.transfer = function(token, target, amount) {
    return doRequest(
        'POST',
        this.host + '/api/1/transfers/' + token + '/' + target,
        {amount:amount}
    );
}
