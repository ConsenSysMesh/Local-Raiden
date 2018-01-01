/**
 * @file Creates constructors for contract interfaces from ABI files.
 * @author Ben Edgington
 */

"use strict";

const fs = require('fs');

module.exports = ContractConstructor;

/**
 * Given an ABI file and a Web3 object, this function returns a constructor
 * for an object with a method for each constant function defined in the ABI.
 *
 * @param {string} abi_file - The path to the ABI file to be used.
 * @param {object} web3 - A Web3 object.
 * @returns {function} A constructor for the contract interface.
 */
function ContractConstructor(abi_file, web3) {

    var abi =  JSON.parse(fs.readFileSync(abi_file, 'utf8'));

    // This is the constructor we return
    return function(contract_address) {

        this.contract = new web3.eth.Contract(abi);
        this.contract.options.address = contract_address;

        // Loop over the methods defined in the contract's ABI
        for (let i = 0; i < abi.length; i++) {

            // For now we handle only methods marked "constant"
            if (abi[i].constant === true) {

                // Handle whatever number of input arguments the method has
                // according to the ABI
                for (let j = 0, inputs = []; j < abi[i].inputs.length; j++) {
                    inputs.push(
                        abi[i].inputs[j].name ?
                            abi[i].inputs[j].name :
                            'arg' + i
                    );
                }

                // Create a method on this object to access the contract method
                // with the same name and number of arguments
                this[abi[i].name] = function(...inputs) {
                    return this.contract.methods[abi[i].name](...inputs).call();
                }
            }
        }
    }
}
