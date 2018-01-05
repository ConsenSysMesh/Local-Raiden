/**
 * @file Deploy Raiden contracts to the network and set up some accounts.
 * @author Ben Edgington
 */

/* =============================================================================
To set up a fresh network from scratch:

First remove any old configuration:
> rm -rf geth raiden_data geth.ipc

Start geth (with the test config). Ignore any warnings about environment variables.
> docker-compose run -u $UID geth

Run this script:
> DEBUG=1 node deploy.js

The account info will be output to the console. In addition, a file ".env"
will be created that contain environment variables for docker-compose.
Also, ABI files for the Raiden contracts will be saved.
============================================================================= */

"use strict";

// =============================================================================
// Requires

// web3 must be v1.0.0 or later
const path = require('path');
const util = require('util');
const execSync = require('child_process').execSync;
const Web3 = require('web3');
const fs = require('fs');

// =============================================================================
// Paths and files

// Path to Raiden smart contract source files
const RAIDEN_DIR = 'raiden/raiden/smart_contracts/';

// Path to Token contract source file (must be named Token.sol)
const TOKEN_DIR = '.';

// Path to Solidity compiler
const SOLC = '/usr/local/bin/solc';

// Path to directory in which to write the ABI files
const ABI_DIR = './abis/';
if (!fs.existsSync(ABI_DIR)){fs.mkdirSync(ABI_DIR);}

// The filename to which we will output environment variables
const ENV_FILE = ".env";

// Fetch the debug level from the environment. Default to zero.
// 0: Silent except for summary info.
// 1: Progress in main routine only.
// 2: Informational.
// 3: Full dump of Txs and data.
const debugLevel = process.env.DEBUG == undefined ? 0 : parseInt(process.env.DEBUG);

// =============================================================================
// Set up Web3 environment

// Connect to node
const web3 = new Web3('http://172.13.0.2:8545');

// Pre-created accounts for Raiden nodes.
// We don't actually need to unlock any of these accounts during the set-up.
const ACCTS = [
    "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A",
    "0x1563915e194D8CfBA1943570603F7606A3115508",
    "0x5CbDd86a2FA8Dc4bDdd8a8f69dBa48572EeC07FB",
    "0x7564105E977516C53bE337314c7E53838967bDaC"
];

// =============================================================================
// Run the thing

main();

// =============================================================================
// Main Function

// Just a wrapper to simplify all the async/await stuff
async function main()
{
    var p; // Used to store promises.

    // -----------------------------------------------------------------
    // Initial set-up

    // One account is pre-configured and pre-funded by geth --dev
    debug(1, '*** Fetching initial account information.');
    var account;
    account = await get_account();

    // Transfer some of our Eth stash to fund the pre-configured accounts
    debug(1, '*** Transferring Ether to pre-defined accounts.');
    const wei = web3.utils.toWei('1000', 'Ether');
    p = [];
    for (let i = 0; i < ACCTS.length; i++) {
        p.push(transfer_ether(account, ACCTS[i], wei));
    }
    await Promise.all(p)
        .then(ret => {debug(2, 'Value transfers succeeded.'); debug(3, JSON.stringify(ret))})
        .catch(err => {console.log('Error: value transfers failed.'); console.log(err)});

    // -----------------------------------------------------------------
    // Deploy Raiden contracts

    // Some of the compilation requires the addresses of library contracts.
    var libs = [];

    // Deploy Discovery contract
    debug(1, '*** Deploying Discovery contract.');
    const discovery
        = await deploy_code(
            account,
            compile(RAIDEN_DIR, 'EndpointRegistry', libs)
        );
    debug(2, 'Discovery contract: ' + discovery);

    // Deploy NettingChannelLibrary contract
    debug(1, '*** Deploying NettingChannelLibrary contract.');
    const nettingChannelLibrary
        = await deploy_code(
            account,
            compile(RAIDEN_DIR, 'NettingChannelLibrary', libs)
        );
    libs.push('NettingChannelLibrary:' + nettingChannelLibrary);
    debug(2, 'libs: ' + libs);

    // Deploy ChannelManagerLibrary contract
    debug(1, '*** Deploying ChannelManagerLibrary contract.');
    const channelManagerLibrary
        = await deploy_code(
            account,
            compile(RAIDEN_DIR, 'ChannelManagerLibrary', libs)
        );
    libs.push('ChannelManagerLibrary:' + channelManagerLibrary);
    debug(2, 'libs: ' + libs);

    // Deploy Registry contract
    debug(1, '*** Deploying Registry contract.');
    const registry
        = await deploy_code(
            account,
            compile(RAIDEN_DIR, 'Registry', libs)
        );
    debug(2, 'Registry contract: ' + registry);

    // -----------------------------------------------------------------
    // Write ABIs for other Raiden contracts (we compile, but don't deploy)

    debug(1, '*** Compiling ChannelManagerContract contract.');
    compile(RAIDEN_DIR, 'ChannelManagerContract', libs);
    debug(1, '*** Compiling NettingChannelContract contract.');
    compile(RAIDEN_DIR, 'NettingChannelContract', libs);

    // -----------------------------------------------------------------
    // Deploy Token contract

    debug(1, '*** Deploying Token contract.');
    const token
          = await deploy_code(
              account,
              compile(TOKEN_DIR, 'Token', [])
          );
    debug(2, 'Token contract: ' + token);

    // Set everything up for running the Token contract
    const ERC20_ABI_FILE = path.join(ABI_DIR, 'Token.json');
    const ERC20_ABI = fs.readFileSync(ERC20_ABI_FILE,'utf8');
    const ERC20 = new web3.eth.Contract(JSON.parse(ERC20_ABI));

    // Split our Tokens equally between the pre-configured accounts
    debug(1, '*** Sharing tokens between pre-defined accounts.');
    ERC20.options.address = token;
    ERC20.options.from = account;
    const totalSupply = await ERC20.methods.totalSupply().call();
    const transferAmount = Math.floor(totalSupply/ACCTS.length);
    debug(2, 'totalSupply: ' + totalSupply);
    debug(2, 'transferAmount: ' + transferAmount);
    p = [];
    for (let i = 0; i < ACCTS.length; i++) {
        p.push(ERC20.methods.transfer(ACCTS[i], transferAmount).send());
    }
    await Promise.all(p)
        .then(ret => {debug(2, 'Token transfers succeeded.'); debug(3, JSON.stringify(ret))})
        .catch(err => {console.log('Error: token transfers failed.'); console.log(err)});

    // -----------------------------------------------------------------
    // Write useful quantities to environment variables file

    debug(1, '*** Writing environment variables file.');
    var contents = '';

    for (let i = 0; i < ACCTS.length; i++) {
        contents += `RDN_ACCT${i}=${ACCTS[i]}\n`;
    }
    contents += `RDN_DISCOVERY=${discovery}\n`;
    contents += `RDN_REGISTRY=${registry}\n`;
    contents += `RDN_TOKEN=${token}\n`;
    // Save the userid for later use by docker-compose. Yes - this is a hack.
    // It helps when sharing volumes between container and host on Linux.
    contents += 'RDN_USER=' + require('os').userInfo().uid + "\n";

    await fs.writeFile(ENV_FILE, contents, function(err) {
        if(err) {
            return console.log(err);
        }
        debug(2, "Environment variables written to " + ENV_FILE);
    });

    // -----------------------------------------------------------------
    // Summarise what we've done.

    console.log("\nSummary\n=======\n");
    console.log('Deployment account: ' + account);
    for (let i = 0; i < ACCTS.length; i++) {
        console.log(`Account_${i}: ` + ACCTS[i]  + "\n  balance: " + await get_balance(ACCTS[i]) + "\n  tokens:  " + await ERC20.methods.balanceOf(ACCTS[i]).call());
    }
    console.log('Discovery contract: ' + discovery);
    console.log('Registry contract:  ' + registry);
    console.log('Token contract:     ' + token);
    console.log('');

    debug(1, '*** Finished.');
}

// =============================================================================
// Helper Functions

/**
 * There should be one account pre-funded and unlocked by geth --dev
 * This function finds it and returns the address.
 * @returns {Promise} Resolves to the address of the unlocked and funded account.
 */
async function get_account()
{
    var accounts = await web3.eth.getAccounts();
    var account;

    if (accounts.length > 0) {
        account = accounts[0];
        debug(2, 'account: ' + account + ', balance: ' + await get_balance(account));
    } else {
        throw 'Unable to find the account unlocked by "geth --dev".';
    }

    return account;
}

/**
 * Returns the Ether balance of an account.
 * @param {string} account - The address of the account.
 * @returns {Promise} Resolves to the account balance.
 */
async function get_balance(account)
{
    return web3.eth.getBalance(account);
}

/**
 * Deploys the contract in `binary` from the account `account`.
 * @param {string} account - The "from" account for deployment.
 * @param {string} binary - Hexadecimal code, no lead "0x", of contract to deploy.
 * @returns {Promise} Resolves to address of the deployed contract.
 */
async function deploy_code(account, binary)
{
    debug(3, binary);

    var txReceipt = await web3.eth.sendTransaction({from:account, data:'0x' + binary, gas:3000000});
    debug(3, JSON.stringify(txReceipt));

    // TODO: error handling

    return txReceipt.contractAddress;
}

/**
 * Transfers Ether between accounts.
 * @param {string} from - The sending account.
 * @param {string} to - The receiving account.
 * @param {number} amount - Amount of Wei to transfer.
 * @returns {Promise} Resolves to transaction receipt for the transfer.
 */
async function transfer_ether(from, to, amount)
{
    debug(2, 'transfer_ether from: '   + from);
    debug(2, 'transfer_ether to: '     + to);
    debug(2, 'transfer_ether amount: ' + web3.utils.fromWei(amount) + ' Eth');

    // TODO: error handling

    return web3.eth.sendTransaction({from:from, to:to, gas:21000, value:amount});
}

/**
 * Compile a Solidity file and save its ABI (NB synchronous).
 * @param {string} dir - The directory containin the Solidity file.
 * @param {string} name - The base name of the file (excluding .sol suffix).
 * @param {string[]} libs - Array of previously compiled library contracts.
 * @returns {string} Hexadecimal bytecode, suitable for deployment.
 */
function compile(dir, name, libs)
{
    // Construct the "--libraries" parameter
    var libstring = '';
    for (var i=0; i < libs.length; i++) {
        libstring += libs[i];
        if (i !== libs.length - 1) libstring += ' ';
    }
    if (libstring.length !== 0) libstring = "--libraries '" + libstring + "' ";
    debug(2, 'libstring: ' + libstring);

    // Compile the contract
    const stdout = execSync('cd ' + dir + '; ' + SOLC + ' --combined-json bin,abi ' + libstring + name + '.sol');
    debug(3, name + ' compilation output: ' + stdout);

    // Write out ABI for later use
    fs.writeFile(
        path.join(ABI_DIR, name + '.json'),
        (JSON.parse(stdout.toString())).contracts[name + '.sol:' + name].abi,
        function(err) {
            if(err) {
                return console.log(err);
            }
            debug(2, 'ABI for ' + name + '.sol' + ' written to ' + path.join(ABI_DIR, name + '.json'))
        }
    );

    // Return the bytecode
    return (JSON.parse(stdout.toString())).contracts[name + '.sol:' + name].bin;
}

// =============================================================================
// Debugging

function debug(level, message)
{
    if(level <= debugLevel) {
        console.log('DEBUG[' + level + '] ' + message);
    }
}
