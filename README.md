# A local Raiden test network

* [Introduction](#introduction)
* [Setting-up](#setting-up)
* [Raiden contract deployment](#raiden-contract-deployment)
* [Running Raiden](#running-raiden)
* [Exploring Raiden](#exploring-raiden)
* [Notes](#notes)

## Introduction

The goal is to set up a local Raiden network running in Docker containers, allowing for easier exploration and experimentation than using the Ropsten testnet version.

Advantages:

* No need to keep a synced Ropsten node up and running.
* No need to get hold of Ropsten test Ether.
* Faster, more predictable blocktimes.
* No tricky NAT issues to deal with.
* Easy tear-down and restart - it's not permanent :-)

The set-up is a single Docker container representing the Ethereum blockchain, in the form of a `geth --dev` node, and _N_ containers for Raiden clients that communicate with each other and the blockchain.

Raiden is at the "Developer Preview" stage, and comes with a [disclaimer and notes](http://raiden-network.readthedocs.io/en/stable/what_is_the_dev_preview.html#disclaimer). The official Dev Preview version is 0.2.0, but that has a [bug](https://github.com/raiden-network/raiden/pull/1141) around closing channels. For this reason we are using a more recent commit. Unfortunately, that breaks the nice Web GUI... we'll have to live without it for now.

Background reading on Raiden:

* [Raiden Network: Vision, Challenges and Roadmap](https://medium.com/@raiden_network/raiden-network-vision-challenges-and-roadmap-593dfa34b868)
  * A gentle introduction to the key points
* [Raiden FAQ](https://raiden.network/faq.html)
  * Lots of ELI5 stuff.
* [What is the Raiden Network?](https://raiden.network/101.html)
  * A 101 on the technology. The next level down.
* [The official documentation](http://raiden-network.readthedocs.io/en/stable/spec.html)
* [The Raiden GitHub](https://github.com/raiden-network/raiden)

## Setting up

### Prerequisites

There are some prerequisites:

1. Docker (with docker-compose), and
2. Node.js, with [web3](https://www.npmjs.com/package/web3) installed. web3 must be version 1.0.
3. The [Solidity compiler](http://solidity.readthedocs.io/en/develop/installing-solidity.html#binary-packages)

My environment:

```
> uname -a
Linux Lubuntu-Nov17 4.13.0-21-generic #24-Ubuntu SMP Mon Dec 18 17:29:16 UTC 2017 x86_64 x86_64 x86_64 GNU/Linux
> docker --version
Docker version 17.12.0-ce, build c97c6d6
> node --version
v8.9.3
> npm --version
5.6.0
> npm list web3
/home/ben/Everything/Ethereum/Raiden/Local-Raiden
└── web3@1.0.0-beta.26
> /usr/local/bin/solc --version
solc, the solidity compiler commandline interface
Version: 0.4.19-develop.2018.1.3+commit.c4cbbb05.Linux.g++
```

### Docker images

We use the [official Docker image](https://hub.docker.com/r/ethereum/client-go/) for Geth, which you can get with,

```
docker pull ethereum/client-go
```

We need to build an image for the Raiden client. Do the following in the _Local-Raiden_ directory. This will take a while, but needs doing only once.

```
docker build -t my/raiden .
```

## Raiden contract deployment

Raiden essentially consists of two components.

1. The Raiden client that we built above. This communicates with other Raiden clients to make payments, and occasionally with the blockchain to open, close and settle payment channels.

2. A set of [smart contracts](https://github.com/raiden-network/raiden/tree/v0.2.0/raiden/smart_contracts/) that need to be deployed.

So, we need to deploy the contracts to our test network. Raiden provides a [Python script](https://github.com/raiden-network/raiden/blob/v0.2.0/tools/deploy.py) for this, but my Python-fu is weak and I ended up with all sorts of dependency issues. So I reverted to something more familiar and made the [_deploy.js_](deploy.js) Node.js script instead.

Working in the _Local-Raiden_ directory, first clear out any old Geth or Raiden data (not necessary the first time):

```
rm -rf geth raiden_data geth.ipc
```

Start a Geth Docker container. All the config is already set up in the _docker-compose.yml_ file, so we can just do the following.

```
docker-compose run -u $UID geth
```

Finally, run the deployment script. You may need to edit the path to the Solidity compiler, `SOLC`.

```
DEBUG=1 node deploy.js
```

This will output progress, and a summary of the final status. It will also create a _.env_ file containing environment variables to be passed to docker-compose.

Finally, stop Geth (`Ctrl-C` will do it). All being well, everything is now set up on the blockchain within the _geth_ directory. Don't delete this directory if you want to keep the blockchain state.

### Discussion

The output should resemble the following, with perhaps different addresses for contracts.

```
Summary
=======

Deployment account: 0x78910ad1D145B20fdcd31B20D43D82dd998C194A
Account_0: 0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A
  balance: 2000000000000000000000
  tokens:  250000
Account_1: 0x1563915e194D8CfBA1943570603F7606A3115508
  balance: 2000000000000000000000
  tokens:  250000
Account_2: 0x5CbDd86a2FA8Dc4bDdd8a8f69dBa48572EeC07FB
  balance: 2000000000000000000000
  tokens:  250000
Account_3: 0x7564105E977516C53bE337314c7E53838967bDaC
  balance: 2000000000000000000000
  tokens:  250000
Discovery contract: 0x019Ae5c6C16C1356ccDe9cc2DB5415a259a0F2C5
Registry contract:  0xd1AFb72FFA57e4163175EFB9179bB63b500BB3b0
Token contract:     0x2e8EdB207922794aEcB1A2cDC5a730612eefF034
```

The deployment script performs the following tasks.

1. Transfers (test) Ether from Geth's pre-funded account to the four accounts that we have set up in _keystore/_.

2. Deploys contracts as follows,

   a. the Discovery contract, _EndpointRegistry.sol_

   b. the Netting Channel Library contract, _NettingChannelLibrary.sol_

   c. the Channel Manager Library contract, _ChannelManagerLibrary.sol_

   d. the Registry contract, _Registry.sol_

   e. an ERC20 Token contract, _Token.sol_

3. For all of the above, and in addition _ChannelManagerContract.sol_ and _NettingChannelContract.sol_, the ABI is saved in the _abis_ folder for later use.

4. The tokens in the ERC20 token contract are split equally between the four accounts.

5. Values required by docker-compose are written to the _.env_ file.

## Running Raiden

Now all we need to do to start the whole network is,

```
docker-compose up -d
```

To shut it all down, do

```
docker compose down
```

Geth and Raiden will store their intermediate states in the _geth_ and _raiden\_data_ directories respectively, so you can do this repeatedly.

This sets up two Raiden containers along with a Geth container, configured as follows.

* Geth
   * RPC interface: `172.13.0.2:8545`
      * Mapped to `localhost:8545` (optional: for convenience)
* Raiden 0
   * RPC interface: `172.13.0.3:5001`
      * Mapped to `localhost:5001` (optional: for convenience)
   * Raiden Network interface: `172.13.0.3:40001`
* Raiden 1
   * RPC interface: `172.13.0.4:5001`
      * Mapped to `localhost:5002` (optional: for convenience)
   * Raiden Network interface: `172.13.0.4:40001`

You can see the console output of each container with `docker logs`. The container names are output by docker-compose, or by executing `docker ps`.


## Exploring Raiden

> The below is a just "getting started". I hoping to work on some articles digging deeper into what's going on "under-the-hood", including mediated transfers that involve multiple nodes. Watch this space...

Now that our Raiden nodes are running, it is possible to interact with them
via their RPC interfaces directly from the shell command line:

```
> curl http://172.13.0.3:5001/api/1/address
{"our_address": "0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a"}
> curl http://172.13.0.4:5001/api/1/address
{"our_address": "0x1563915e194d8cfba1943570603f7606a3115508"}
```

But this quickly becomes tedious, especially for the more complex operations. I've created some [JavaScript classes](modules/README.md) in the _modules/_ directory to make this easier. See its [README](modules/README.md) for more info. We use the Node REPL:

```
> node
```

First set some useful variables to keep from having to copy/paste long strings: the Ethereum addresses of our two nodes and the token contract.


```
> var acct0 = '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A'
> var acct1 = '0x1563915e194D8CfBA1943570603F7606A3115508'
> var token_address = '0x02cAf13e4b645b3dBf27f6Ae1647356A2410210F'
```

Now we import the Raiden interface and make an instance for each node.

```
> var Rdn = require('./modules/raiden.js')
> var r0 = new Rdn('http://172.13.0.3:5001')
> var r1 = new Rdn('http://172.13.0.4:5001')
```

We can call methods on these Raiden node objects. Everything is asynchronous (this is JavaScript), and all methods return Promises, hence the clunky `.then(console.log)` part. I've also edited the output to clean up all the Promise junk that gets printed. [If anyone knows how to (nicely) make synchronous calls to async functions from the REPL (`await` is not available), please get in touch!]

```
> r0.address().then(console.log)
{ our_address: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a' }
> r1.address().then(console.log)
{ our_address: '0x1563915e194d8cfba1943570603f7606a3115508' }
```

Now, let's register the token. The Registry contract will create a Channel Manager contract that will oversee all channels that exchange this token. This interacts with the blockchain, so takes a few seconds to resolve.

```
> r0.tokens.register(token_address).then(console.log)
{ channel_manager_address: '0x7f799b2c9fc03f10e8cabdb06bf916402bab1a8f' }
```

With that done we can create a channel between Node0 and Node1 to allow tokens to be exchanged off-chain. This creates another smart contract called a Netting Channel that is responsible only for transfers of this token between these two nodes. It also makes a token transfer into the Netting Contract from Node0's balance (the deposit, 100 tokens in this case). Once again, it takes a few seconds.

```
> r0.channels.open(acct1, token_address, 100, 30).then(console.log)
{ partner_address: '0x1563915e194d8cfba1943570603f7606a3115508',
  balance: 100,
  reveal_timeout: 10,
  settle_timeout: 30,
  state: 'opened',
  channel_address: '0x6432ed34e54ccc4e3219e5ec65f398d02cff2b89',
  token_address: '0x02caf13e4b645b3dbf27f6ae1647356a2410210f' }
```

The `settle_timeout` is the last parameter and is the number of blocks that the settlement window remains open for challenges after a channel is closed.

We can now make some transfers!

Node0 sends 50 tokens to Node1. We check balances before and after:

```
> var channel = '0x6432ed34e54ccc4e3219e5ec65f398d02cff2b89'
> r0.channels.balance(channel).then(console.log)
100
> r1.channels.balance(channel).then(console.log)
0

> r0.transfer(token_address, acct1, 50).then(console.log)
> { target_address: '0x1563915e194d8cfba1943570603f7606a3115508',
  amount: 50,
  identifier: 6889929806137958000,
  token_address: '0x02caf13e4b645b3dbf27f6ae1647356a2410210f',
  initiator_address: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a' }

> r0.channels.balance(channel).then(console.log)
50
> r1.channels.balance(channel).then(console.log)
50
```

This is instantaneous! The blockchain is not involved. We can check the token balance on the actual blockchain using a different module provided in the _modules/_ directory. This uses Web3 to access the Raiden contracts directly.

```
> var Contracts = require('./modules/raiden-contracts.js')
> var contracts = new Contracts('http://172.13.0.2:8545')
> var token = new contracts.interface(token_address, 'abis/Token.json')
> token.balanceOf(acct0).then(console.log)
249900
> token.balanceOf(acct1).then(console.log)
250000
```

Node0's actual token balance has decreased from the initial 250000 by the 100 tokens initially lodged as a deposit. Node1's balance is unchanged. The 50 token Raiden transfer has not yet been reflected back to the blockchain, and won't be until the channel is settled.

We can continue to send tokens back and forth between the nodes, subject to a cap of original deposit + net tokens received in this channel. However, to release the tokens back to the blockchain and make the transfers "real", we need to close the channel down. There is (currently) no way to keep the channel open and extract some of the balance.

Node1 will initiate the channel closing process. This involves a call to the Netting Contract, so takes a few seconds.

```
> r1.channels.close(channel).then(console.log)
{ partner_address: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
  balance: 50,
  reveal_timeout: 10,
  settle_timeout: 30,
  state: 'opened',
  channel_address: '0x6432ed34e54ccc4e3219e5ec65f398d02cff2b89',
  token_address: '0x02caf13e4b645b3dbf27f6ae1647356a2410210f' }
```

Eventually, after waiting for `settle_timeout` blocks, the channel state is marked `'settled'` and we can see the token balances of each account have been correctly updated on the blockchain.  It is no longer possible to make transfers on this channel.

```
> r1.channels.info(channel).then(console.log)
{ partner_address: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
  balance: 50,
  reveal_timeout: 10,
  settle_timeout: 30,
  state: 'settled',
  channel_address: '0x6432ed34e54ccc4e3219e5ec65f398d02cff2b89',
  token_address: '0x02caf13e4b645b3dbf27f6ae1647356a2410210f' }

> token.balanceOf(acct0).then(console.log)
249950
> token.balanceOf(acct1).then(console.log)
250050
```

## Notes

### Block times

The configuration here uses a fixed block time of 3 seconds. You can decrease that to make things quicker, or increase it to more closely match real network times. This line in _docker-compose.yml_,

```
      --dev.period 3
```

Although `dev.period` can be set to zero, meaning that Geth will produce blocks only on demand, I don't recommend it. Raiden channel settlement times are measured in blocks: if no blocks are produced, channels will never settle.

### More than four Raiden nodes

Out of the box, the deployment script allows for up to four accounts to be initialised, which means up to four Raiden nodes since each needs its own account.

To create larger networks,

1. Make some more accounts in _keystore_. I do this as follows,

   `docker run -v /tmp:/tmp quorum geth --password /tmp/password.txt --keystore /tmp account import /tmp/key1.txt`

   _password.txt_ contains the password "password" - I couldn't get Raiden to accept an empty password from a file, although it will from the command line. _keyN.txt_ contains the 64 hex character private key for the account.

   The current four accounts use 1x64, 2x64, 3x64 and 4x64 respectively as the private keys. Please, please don't use them in a production/public network.

   Move the resulting `UTC--` files to _Local-Raiden/keystore_.

2. Add the account addresses to the `ACCTS[]` array in _deploy.js_.

3. Clear down the blockchain and re-run _deploy.js_ as above.
