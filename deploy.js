// Path to Raiden smart contract source files
const RAIDEN_DIR = "../raiden/raiden/smart_contracts/";
const TOKEN_DIR = ".";

// Requires
const util = require('util');
const execSync = require('child_process').execSync;
const Web3 = require('web3');

// Connect to node
// docker run --network="host" -u $UID -v `pwd`:/shared ethereum/client-go --datadir /shared --nodiscover --dev --rpc
const web3 = new Web3('http://localhost:8545');

// Pre-created accounts.
// Keystore files for these are in ./keystore. No passwords.
const ACCT1 = "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A";
const ACCT2 = "0x1563915e194D8CfBA1943570603F7606A3115508";
const ACCT3 = "0x5CbDd86a2FA8Dc4bDdd8a8f69dBa48572EeC07FB";
const ACCT4 = "0x7564105E977516C53bE337314c7E53838967bDaC";

main();

// ---- Main Function --------------------------------------------------

// Just a wrapper to simplify all the async/await stuff
async function main()
{
    var account;

    // This account is pre-configured and pre-funded by geth --dev
    account = await get_account();
    debug(1, 'Acct: ' + account);

    // Some of the compilation requires the addresses of library contracts.
    var libs = [];
    
    // Deploy Discovery contract
    var discovery
        = await deploy_code(
            account,
            compile(RAIDEN_DIR, 'EndpointRegistry', libs)
        );

    debug(1, 'Discovery contract: ' + discovery);
    
    // Deploy NettingChannelLibrary contract
    var nettingChannelLibrary
        = await deploy_code(
            account,
            compile(RAIDEN_DIR, 'NettingChannelLibrary', libs)
        );

    libs.push('NettingChannelLibrary:' + nettingChannelLibrary);
    debug(2, 'libs: ' + libs);

    // Deploy ChannelManagerLibrary contract
    var channelManagerLibrary
        = await deploy_code(
            account,
            compile(RAIDEN_DIR, 'ChannelManagerLibrary', libs)
        );

    libs.push('ChannelManagerLibrary:' + channelManagerLibrary);
    debug(2, 'libs: ' + libs);

    // Deploy Registry contract
    var registry
        = await deploy_code(
            account,
            compile(RAIDEN_DIR, 'Registry', libs)
        );

    debug(2, 'Registry contract: ' + registry);

    // Transfer some of our Eth stash to fund the pre-configured accounts
    var wei = web3.utils.toWei('1000', 'Ether');
    await Promise.all([
        transfer_ether(account, ACCT1, wei),
        transfer_ether(account, ACCT2, wei),
        transfer_ether(account, ACCT3, wei),
        transfer_ether(account, ACCT4, wei)
    ])
        .then(ret => {debug(1, 'Value transfers succeeded.'); debug(2, JSON.stringify(ret))})
        .catch(err => {console.log('Error: value transfers failed.'); console.log(err)});

/*
    // Transfer some of our Tokens to fund the pre-configured accounts
    await Promise.all([
        transfer_tokens(token, account, ACCT1, num),
        transfer_tokens(token, account, ACCT2, num),
        transfer_tokens(token, account, ACCT3, num),
        transfer_tokens(token, account, ACCT4, num)
    ])
        .then(ret => {debug(1, 'Token transfers succeeded.'); debug(2, JSON.stringify(ret))})
        .catch(err => {console.log('Error: token transfers failed.'); console.log(err)});
*/

    // Finally: summarise what we've done.
    console.log(`Main account: ` + account);
    console.log(`Account_1: ` + ACCT1 + ', balance: ' + await get_balance(ACCT1));
    console.log(`Account_2: ` + ACCT2 + ', balance: ' + await get_balance(ACCT1));
    console.log(`Account_3: ` + ACCT3 + ', balance: ' + await get_balance(ACCT1));
    console.log(`Account_4: ` + ACCT4 + ', balance: ' + await get_balance(ACCT1));
    console.log(`Raiden flags: --registry-contract-address ${registry} --discovery-contract-address ${discovery}`);

}

// ---- Helper Functions -----------------------------------------------

// There should be one account pre-funded and unlocked by geth --dev
// This function finds it and returns the address.
async function get_account()
{
    var accounts = await web3.eth.getAccounts();
    var account;
     
    if (accounts.length > 0) {
        account = accounts[0];
        debug(1, 'account: ' + account + ', balance: ' + await get_balance(account));
    } else {
        //TODO: Fail
    }

    return account;
}

// Return the Ether balance of an account.
async function get_balance(account)
{
    return web3.eth.getBalance(account);
}

// Deploy the contract in `binary` from the account `account`.
async function deploy_code(account, binary)
{
    debug(3, binary);

    txReceipt = await web3.eth.sendTransaction({from:account, data:'0x' + binary, gas:5000000});
    debug(2, JSON.stringify(txReceipt));

    // TODO: error handling
    
    return txReceipt.contractAddress;
}

// Transfer Ether between accounts (`amount` is in Wei).
async function transfer_ether(from, to, amount)
{
    debug(1, 'transfer_ether from: '   + from);
    debug(1, 'transfer_ether to: '     + to);
    debug(1, 'transfer_ether amount: ' + web3.utils.fromWei(amount) + ' Eth');

    return web3.eth.sendTransaction({from:from, to:to, gas:"0x5208", value:amount});

}

// Compile `name`.sol after cd to `dir`, using the library contracts in `libs`.
// This is synchronous, not async.
function compile(dir, name, libs)
{
    var libstring = '';
    for (var i=0; i < libs.length; i++) {
        libstring += libs[i];
        if (i !== libs.length - 1) libstring += ' ';
    }
    if (libstring.length !== 0) libstring = "--libraries '" + libstring + "' ";
    debug(2, 'libstring: ' + libstring);
    const stdout = execSync('cd ' + dir + '; /usr/local/bin/solc --combined-json bin ' + libstring + name + '.sol');
    debug(3, name + ' compilation output: ' + stdout);
    return (JSON.parse(stdout.toString())).contracts[name + '.sol:' + name].bin;
}

// -----------------------------------------------------------------------------
// Debugging

// e.g. DEBUG=2 node deploy.js
// Default level is 0.
var debugLevel = process.env.DEBUG == undefined ? 0 : parseInt(process.env.DEBUG);
function debug(level, message)
{
    if(level <= debugLevel) {
        console.log('DEBUG[' + level + '] ' + message);
    }
}
