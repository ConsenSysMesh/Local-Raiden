// Path to Raiden smart contract source files
const RAIDEN_DIR = "../raiden/raiden/smart_contracts/";
const TOKEN_DIR = ".";

// The filename to which we will output environment variables
const ENVFILE = "env.sh";

// Requires
// web3 must be v1.0.0 or later
const util = require('util');
const execSync = require('child_process').execSync;
const Web3 = require('web3');
const fs = require('fs');

// Connect to node
// docker run --network="host" -u $UID -v `pwd`:/shared ethereum/client-go --datadir /shared --nodiscover --dev --rpc
const web3 = new Web3('http://localhost:8545');

// Pre-created accounts.
// Keystore files for these are in ./keystore. No passwords.
const ACCT1 = "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A";
const ACCT2 = "0x1563915e194D8CfBA1943570603F7606A3115508";
const ACCT3 = "0x5CbDd86a2FA8Dc4bDdd8a8f69dBa48572EeC07FB";
const ACCT4 = "0x7564105E977516C53bE337314c7E53838967bDaC";

// Set everything up for running the Token contract
const ERC20_ABI_FILE = 'erc20_abi.json';
const ERC20_ABI = fs.readFileSync(ERC20_ABI_FILE,'utf8');
const ERC20 = new web3.eth.Contract(JSON.parse(ERC20_ABI));

main();

// =====================================================================
// Main Function

// Just a wrapper to simplify all the async/await stuff
async function main()
{

    // -----------------------------------------------------------------
    // Get local account info

    // One account is pre-configured and pre-funded by geth --dev
    var account;
    account = await get_account();
    debug(1, 'Acct: ' + account);

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


    // -----------------------------------------------------------------
    // Deploy Raiden contracts

    // Some of the compilation requires the addresses of library contracts.
    var libs = [];
    
    // Deploy Discovery contract
    var discovery
        = await deploy_code(
            account,
            compile(RAIDEN_DIR, 'EndpointRegistry', libs)
        );
    debug(2, 'Discovery contract: ' + discovery);
    
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


    // -----------------------------------------------------------------
    // Deploy Token contract

    var token
        = await deploy_code(
            account,
            compile(TOKEN_DIR, 'Token', [])
        );
    debug(2, 'Token contract: ' + token);

    // Split our Tokens equally between the pre-configured accounts
    ERC20.options.address = token;
    ERC20.options.from = account;
    var totalSupply = await ERC20.methods.totalSupply().call();
    debug(1, 'totalSupply: ' + totalSupply);
    await Promise.all([
        ERC20.methods.transfer(ACCT1, Math.floor(totalSupply/4)).send(),
        ERC20.methods.transfer(ACCT2, Math.floor(totalSupply/4)).send(),
        ERC20.methods.transfer(ACCT3, Math.floor(totalSupply/4)).send(),
        ERC20.methods.transfer(ACCT4, Math.floor(totalSupply/4)).send()
    ])
        .then(ret => {debug(1, 'Token transfers succeeded.'); debug(2, JSON.stringify(ret))})
        .catch(err => {console.log('Error: token transfers failed.'); console.log(err)});


    // -----------------------------------------------------------------
    // Summarise what we've done.

    console.log('Deployment account: ' + account);
    console.log("Account_1: " + ACCT1  + "\n  balance: " + await get_balance(ACCT1) + "\n  tokens:  " + await ERC20.methods.balanceOf(ACCT1).call());
    console.log("Account_2: " + ACCT2  + "\n  balance: " + await get_balance(ACCT2) + "\n  tokens:  " + await ERC20.methods.balanceOf(ACCT2).call());
    console.log("Account_3: " + ACCT3  + "\n  balance: " + await get_balance(ACCT3) + "\n  tokens:  " + await ERC20.methods.balanceOf(ACCT3).call());
    console.log("Account_4: " + ACCT4  + "\n  balance: " + await get_balance(ACCT4) + "\n  tokens:  " + await ERC20.methods.balanceOf(ACCT4).call());
    console.log('Discovery contract: ' + discovery);
    console.log('Registry contract:  ' + registry);
    console.log('Token contract:     ' + token);
    console.log(`Raiden flags: --registry-contract-address ${registry} --discovery-contract-address ${discovery}`);

    // -----------------------------------------------------------------
    // Write useful quantities to environment variables file

    var contents = '';

    contents += `export RDN_ACCT1=${ACCT1}\n`;
    contents += `export RDN_ACCT2=${ACCT2}\n`;
    contents += `export RDN_ACCT3=${ACCT3}\n`;
    contents += `export RDN_ACCT4=${ACCT4}\n`;
    contents += `export RDN_DISCOVERY=${discovery}\n`;
    contents += `export RDN_REGISTRY=${registry}\n`;
    contents += `export RDN_TOKEN=${token}\n`;
    // For convenience within the docker-compose file:
    contents += `export UID\n`;
    
    await fs.writeFile(ENVFILE, contents, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("Environment variables written to " + ENVFILE);
    });

}

// =====================================================================
// Helper Functions

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

// =====================================================================
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
