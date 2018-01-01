/**
 * @file A utility function for communicating via RPC.
 * @author Ben Edgington
 */

"use strict";

const XMLHttpRequest = require('xhr2');

module.exports = doRequest;

/**
 * A utility function for communicating via RPC.
 * @param {string} method - HTTP methods such as 'GET', 'POST', 'PATCH', etc.
 * @returns {Promise}
 */
function doRequest(method, url, payload)
{
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.setRequestHeader('Content-Type','application/json');
        xhr.onload = resolve;
        xhr.onerror = reject;
        xhr.send(JSON.stringify(payload));
    })
        .then(
            function onResolve(ret)
            {
                try {
                    // In the happy flow we get a JSON response
                    return JSON.parse(ret.target.response);
                } catch(err) {
                    // HTTP errors (404, 500, etc.) result in text/html
                    return ret.target.response;
                }
            },
            function onReject(err)
            {
                console.log(err);
                console.log("*** Error connecting to RPC port.");
            }
        )
        .catch(console.log); // Catch-all.
}
