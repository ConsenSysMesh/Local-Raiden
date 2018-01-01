/**
 * @file A class for creating interfaces to Raiden RPC tokens methods.
 * @author Ben Edgington
 */

"use strict";

const doRequest = require('./raiden-rpc.js');

module.exports = Tokens;

/**
 * The Tokens class.
 * @param {string} host - The Raiden node RPC, e.g. 'http://127.0.0.1:5001'.
 * @constructor
 */
function Tokens(host) {
    this.host = host;
}

/**
 * List all tokens.
 * @returns {Promise} Resolves to the list of tokens registered.
 */
Tokens.prototype.list = function() {
    return doRequest('GET', this.host + '/api/1/tokens');
}

/**
 * Register a token.
 * @param {string} token - address of the token contract.
 * @returns {Promise}
 */
Tokens.prototype.add = function(token) {
    return doRequest(
        'PUT',
        this.host + '/api/1/tokens/' + token
    );
}
