/**
 * @file A class for creating interfaces to Raiden RPC events methods.
 * @author Ben Edgington
 */

"use strict";

const doRequest = require('./raiden-rpc.js');

module.exports = Events;

/**
 * The Events class.
 * @param {string} host - The Raiden node RPC, e.g. 'http://127.0.0.1:5001'.
 * @constructor
 */
function Events(host) {
    this.host = host;
}

/**
 * List all network events.
 * @param {number} [block=0] - The starting block number, default zero.
 * @returns {Promise} Resolves to a list of all network events.
 */
Events.prototype.network = function(block) {
    return doRequest(
        'GET',
        this.host + '/api/1/events/network'
            + (block === undefined ? '' : '?from_block=' + block)
    );
}

/**
 * List all events concerning `token`.
 * @param {string} token - The token contract address.
 * @param {number} [block=0] - The starting block number, default zero.
 * @returns {Promise} Resolves to a list of events.
 */
Events.prototype.token = function(token, block) {
    return doRequest(
        'GET',
        this.host + '/api/1/events/tokens/' + token
            + (block === undefined ? '' : '?from_block=' + block)
    );
}

/**
 * List all events concerning `channel`, starting from `block` (optional).
 * @param {string} channel - The channel (Netting contract) address.
 * @param {number} [block=0] - The starting block number, default zero.
 * @returns {Promise} Resolves to a list of events.
 */
Events.prototype.channel = function(channel, block) {
    return doRequest(
        'GET',
        this.host + '/api/1/events/channels/' + channel
            + (block === undefined ? '' : '?from_block=' + block)
    );
}
