/**
 * @file A class for creating interfaces to Raiden RPC channels methods.
 * @author Ben Edgington
 */

"use strict";

const doRequest = require('./raiden-rpc.js');

module.exports = Channels;

/**
 * The Channels class.
 * @param {string} host - The Raiden node RPC, e.g. 'http://127.0.0.1:5001'.
 * @constructor
 */
function Channels(host) {
    this.host = host;
}

// =====================================================================
// Read-only methods

/**
 * List all non-settled channels.
 * @returns {Promise} Resolves to a list of channel info (Netting contracts).
 */
Channels.prototype.list = function() {
    return doRequest('GET', this.host + '/api/1/channels');
}

/**
 * Get information about a specific channel.
 * @param {string} channel - Address of the channel (the Netting contract).
 * @returns {Promise} Resolves to information about a specific channel.
 */
Channels.prototype.info = function(channel) {
    return doRequest('GET', this.host + '/api/1/channels/' + channel);
}

/**
 * Get my current balance in a specific channel.
 * @param {string} channel - Address of the channel (the Netting contract).
 * @returns {Promise} Resolves to my balance in the channel.
 */
Channels.prototype.balance = function(channel) {
    return doRequest('GET', this.host + '/api/1/channels/' + channel)
        .then(ret => ret.balance);
}

// =====================================================================
// State-changing methods

/**
 * Open a channel between two nodes.
 * @param {string} partner - Address of counterpart in the channel.
 * @param {string} token - Address of token to be handled.
 * @param {number} balance - Initial balance to transfer into the channel.
 * @param {number} settle_timeout - Settlement timeout in blocks.
 * @returns {Promise}
 */
Channels.prototype.open = function(partner, token, balance, settle_timeout) {
    return doRequest(
        'PUT',
        this.host + '/api/1/channels',
        {partner_address:partner, token_address:token, balance:balance, settle_timeout:settle_timeout}
    );
}

// TODO - test
/**
 * Close a channel.
 * @param {string} channel - Address of the channel (the Netting contract).
 * @returns {Promise}
 */
Channels.prototype.close = function(channel) {
    return doRequest(
        'PATCH',
        this.host + '/api/1/channels/' + channel,
        {state:'closed'}
    );
}

// TODO - test
// TODO - isn't this done automatically?
/**
 * Settle a channel.
 * @param {string} channel - Address of the channel (the Netting contract).
 * @returns {Promise}
 */
Channels.prototype.settle = function(channel) {
    return doRequest(
        'PATCH',
        this.host + '/api/1/channels/' + channel,
        {state:'settled'}
    );
}

// TODO - test
/**
 * Deposit further tokens into a channel
 * @param {string} channel - Address of the channel (the Netting contract).
 * @param {number} amount - Additional number of tokens to deposit.
 * @returns {Promise}
 */
Channels.prototype.deposit = function(channel, amount) {
    return doRequest(
        'PATCH',
        this.host + '/api/1/channels/' + channel,
        {balance:amount}
    );
}
