/**
 * @file Deploy Raiden contracts to the network and set up some accounts.
 * @author Ben Edgington
 */

/* =============================================================================
To set up a fresh network from scratch:

First remove any old configuration (don't do this on your Mainnet accounts!!!)
> rm -rf keystore geth raiden_data geth.ipc

Start geth (with the test config). Ignore any warnings about environment variables.
> docker-compose run -u $UID geth

Run this script:
> DEBUG=1 node deploy.js

The account info will be output to the console. In addition, a file ".env"
will be created that contains environment variables for docker-compose.
Also, ABI files for the Raiden contracts will be saved.
============================================================================= */

"use strict";

// =============================================================================
// Configuration options

// The URL of the Geth RPC port
const RPC_URL = 'http://172.13.0.2:8545';

// The number of accounts to create - we need one per Raiden node.
const ACCTS_NUM = 4;

// Raiden doesn't like an empty password when using a password file.
// This must match the password in the "password.txt" file.
const ACCTS_PASS = 'password';

// Tokens we wish to create.
// For each token specify [name, symbol, decimals, totalSupply]
const TOKENS =
    [
        ['Token 0', 'TOKEN0', 0, 1000000],
        ['Token 1', 'TOKEN1', 0, 10000000]
    ];

// Path to Raiden smart contract source files
const RAIDEN_DIR = 'raiden/raiden/smart_contracts/';

// Path to Token contract source file (must be named Token.sol)
const TOKEN_DIR = '.';

// Path to Solidity compiler
const SOLC = '/usr/local/bin/solc';

// Path to directory in which to write the ABI files
const ABI_DIR = './abis/';

// The filename to which we will output environment variables
const ENV_FILE = ".env";

// =============================================================================
// Set up execution environment

// web3 must be v1.0.0 or later
const path = require('path');
const util = require('util');
const execSync = require('child_process').execSync;
const Web3 = require('web3');
const fs = require('fs');

const web3 = new Web3(RPC_URL);

// Fetch the debug level from the environment. Default to zero.
// 0: Silent except for summary info.
// 1: Progress in main routine only.
// 2: Informational.
// 3: Full dump of Txs and data.
const debugLevel = process.env.DEBUG == undefined ? 0 : parseInt(process.env.DEBUG);

if (!fs.existsSync(ABI_DIR)){fs.mkdirSync(ABI_DIR);}

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

    // Create accounts for the Raiden nodes
    debug(1, '*** Creating accounts for Raiden nodes.');
    var accts = [];
    for (let i = 0; i < ACCTS_NUM; i++) {
        accts.push(await web3.eth.personal.newAccount(ACCTS_PASS).catch(console.log));
        debug(2, 'Created account: ' + accts[i]);
    }

    // Transfer some of our Eth stash to fund the pre-configured accounts
    debug(1, '*** Transferring Ether to accounts.');
    const wei = web3.utils.toWei('1000', 'Ether');
    p = [];
    for (let i = 0; i < accts.length; i++) {
        p.push(transfer_ether(account, accts[i], wei));
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
    const discovery =
          (await deploy_code(
              account,
              compile(RAIDEN_DIR, 'EndpointRegistry', libs))
          ).options.address;
    debug(2, 'Discovery contract: ' + discovery);

    // Deploy NettingChannelLibrary contract
    debug(1, '*** Deploying NettingChannelLibrary contract.');
    const nettingChannelLibrary =
          (await deploy_code(
              account,
              compile(RAIDEN_DIR, 'NettingChannelLibrary', libs))
          ).options.address;
    libs.push('NettingChannelLibrary:' + nettingChannelLibrary);
    debug(2, 'libs: ' + libs);

    // Deploy ChannelManagerLibrary contract
    debug(1, '*** Deploying ChannelManagerLibrary contract.');
    const channelManagerLibrary =
          (await deploy_code(
              account,
              compile(RAIDEN_DIR, 'ChannelManagerLibrary', libs))
          ).options.address;
    libs.push('ChannelManagerLibrary:' + channelManagerLibrary);
    debug(2, 'libs: ' + libs);

    // Deploy Registry contract
    debug(1, '*** Deploying Registry contract.');
    const registry =
          (await deploy_code(
              account,
              compile(RAIDEN_DIR, 'Registry', libs))
          ).options.address;
    debug(2, 'Registry contract: ' + registry);

    // -----------------------------------------------------------------
    // Write ABIs for other Raiden contracts (we compile, but don't deploy)

    debug(1, '*** Compiling ChannelManagerContract contract.');
    compile(RAIDEN_DIR, 'ChannelManagerContract', libs);
    debug(1, '*** Compiling NettingChannelContract contract.');
    compile(RAIDEN_DIR, 'NettingChannelContract', libs);

    // -----------------------------------------------------------------
    // Deploy Token contracts

    var token_contracts = [];
    for (let j = 0; j < TOKENS.length; j++) {

        debug(1, '*** Deploying Token contract ' + TOKENS[j][1] + '.');
        debug(2, 'Params: ' + TOKENS[j]);
        let ERC20 =
              await deploy_code(
                  account,
                  compile(TOKEN_DIR, 'Token', []),
                  TOKENS[j]
              );
        token_contracts.push(ERC20);

        let token = ERC20.options.address;
        debug(2, 'Token contract: ' + token);

        // Split our Tokens equally between the accounts
        debug(1, '*** Sharing tokens between accounts.');
        ERC20.options.from = account;
        let totalSupply = await ERC20.methods.totalSupply().call();
        let transferAmount = Math.floor(totalSupply/accts.length);
        debug(2, 'totalSupply: ' + totalSupply);
        debug(2, 'transferAmount: ' + transferAmount);
        p = [];
        for (let i = 0; i < accts.length; i++) {
            p.push(ERC20.methods.transfer(accts[i], transferAmount).send());
        }
        await Promise.all(p)
            .then(ret => {debug(2, 'Token transfers succeeded.'); debug(3, JSON.stringify(ret))})
            .catch(err => {console.log('Error: token transfers failed.'); console.log(err)});
    }

    // -----------------------------------------------------------------
    // Write useful quantities to environment variables file

    debug(1, '*** Writing environment variables file.');
    var contents = '';

    for (let i = 0; i < accts.length; i++) {
        contents += `RDN_ACCT${i}=${accts[i]}\n`;
    }
    contents += `RDN_DISCOVERY=${discovery}\n`;
    contents += `RDN_REGISTRY=${registry}\n`;
    for (let i = 0; i < token_contracts.length; i++) {
        contents +=
            'RDN_'
            + await token_contracts[i].methods.symbol().call()
            + '='
            + token_contracts[i].options.address + "\n";
    }
    //contents += `RDN_TOKEN=${token}\n`;
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
    for (let i = 0; i < accts.length; i++) {
        console.log(`Account_${i}: ` + accts[i]);
        console.log('  balance: ' + await get_balance(accts[i]));
        for (let i = 0; i < token_contracts.length; i++) {
            console.log('  ' + await token_contracts[i].methods.symbol().call() + ': ' + await token_contracts[i].methods.balanceOf(accts[i]).call());
        }
    }
    console.log('Discovery contract: ' + discovery);
    console.log('Registry contract:  ' + registry);
    for (let i = 0; i < token_contracts.length; i++) {
        console.log(await token_contracts[i].methods.symbol().call() + ': ' + token_contracts[i].options.address);
    }
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
 * @param {string} code - Object containing both binary and abi for the contract.
 * @param {*} [args[]=[]] - Optional array of parameters to the contract constructor.
 * @returns {Promise} Resolves to the Web3 Contract object.
 */
async function deploy_code(account, code, args)
{
    debug(3, code);

    if (args === undefined) args = [];

    const contract = await (new web3.eth.Contract(JSON.parse(code.abi)))
          .deploy({data: '0x' + code.bin, arguments: args})
          .send({from: account, gas: 3000000})
          .catch(console.log);

    debug(2, 'Contract deployed to: ' + contract.options.address);
    return contract;
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
 * @returns {string} Object containing bytecode, abi, etc. for the contract.
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

    const code = JSON.parse(stdout.toString());

    // Write out ABI for later use
    fs.writeFile(
        path.join(ABI_DIR, name + '.json'),
        code.contracts[name + '.sol:' + name].abi,
        function(err) {
            if(err) {
                return console.log(err);
            }
            debug(2, 'ABI for ' + name + '.sol' + ' written to ' + path.join(ABI_DIR, name + '.json'))
        }
    );

    // Return the bytecode, abi, etc. for the relevant contract.
    return code.contracts[name + '.sol:' + name];
}

// =============================================================================
// Debugging

function debug(level, message)
{
    if(level <= debugLevel) {
        console.log('DEBUG[' + level + '] ' + message);
    }
}
