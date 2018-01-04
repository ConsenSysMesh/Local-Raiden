# The Raiden contracts API

This is a light wrapper around Web3. Given a contract's ABI it generates convenient interfaces to the read-only ("constant") functions on the contract.

In the context of Raiden, this document lists out the various contracts that can be examined and the interfaces available.

All methods are asynchronous and return promises. This is a pain when using the node REPL, but I haven't found a clean way to make things synchronous for nice interactive use.

* [Initialising](#initialising)
* [Discovery interface](#discovery-interface)
* [Registry interface](#registry-interface)
* [Channel Manager interface](#channel-manager-interface)
* [Netting Channel interface](#netting-channel-interface)
* [Token interface](#token-interface)

## Initialising

The constructor needs to be passed the RPC interface for the Geth client.

```
> var Contracts = require('./modules/raiden-contracts.js')
> var contracts = new Contracts('http://172.13.0.2:8545')
```

In all of the below, it is assumed that the ABI files are located in the _abi/_ directory. The _deploy.js_ script generates the ABI files and puts them here by default.

## Discovery interface

For the [_EndpointRegistry.sol_](https://github.com/raiden-network/raiden/blob/v0.2.0/raiden/smart_contracts/EndpointRegistry.sol) (Discovery) contract.

This contract is created by the _deploy.js_ script, and there is one of these per Raiden network. It allows the nodes to find each other across the network.

```
> var discovery = new contracts.interface('0x68c7cfb1082A8E85caEfd8F310aa59a996DBB055','abis/EndpointRegistry.json')
```

### Methods

 * `discovery.findAddressByEndpoint(string socket)`
 * `discovery.findEndpointByAddress(address eth_address)`
 * Automatic getter:
   * `discovery.contract_version()`

### Examples

```
> discovery.contract_version().then(console.log)
0.2._

> discovery.findEndpointByAddress('0x1563915e194D8CfBA1943570603F7606A3115508').then(console.log)
172.13.0.4:40001

> discovery.findAddressByEndpoint('172.13.0.4:40001').then(console.log)
0x1563915e194D8CfBA1943570603F7606A3115508

```

## Registry interface

For the [_Registry.sol_](https://github.com/raiden-network/raiden/blob/v0.2.0/raiden/smart_contracts/Registry.sol) contract.

This contract is created by the _deploy.js_ script, and there is one of these per Raiden network. It manages the Channel Manager contracts.

```
> var registry = new contracts.interface('0x34949D268636BE1aB05552177C3b9341e3C7EC83','abis/Registry.json')
```

### Methods

 * `registry.channelManagerAddresses()`
 * `registry.channelManagerByToken(address token_address)`
 * `registry.tokenAddresses()`
 * Automatic getters:
   * `registry.contract_version()`
   * `registry.registry(address token_address)`
   * `registry.tokens()`

### Examples

```
> registry.contract_version().then(console.log)
0.2._

> registry.tokenAddresses().then(console.log)
[ '0x02cAf13e4b645b3dBf27f6Ae1647356A2410210F' ]

> registry.channelManagerByToken('0x02cAf13e4b645b3dBf27f6Ae1647356A2410210F').then(console.log) 
0x7f799b2c9FC03F10e8CAbdb06BF916402baB1A8F

> registry.channelManagerAddresses().then(console.log)
[ '0x7f799b2c9FC03F10e8CAbdb06BF916402baB1A8F' ]
```

## Channel Manager interface

For the [_ChannelManagerContract.sol_](https://github.com/raiden-network/raiden/blob/v0.2.0/raiden/smart_contracts/ChannelManagerContract.sol) contract.

One of these contracts is created by the Registry for each token that is registered with the network. It manages the Netting Channel contracts for that token.

```
> var cm = new contracts.interface('0x7f799b2c9fc03f10e8cabdb06bf916402bab1a8f','abis/ChannelManagerContract.json')
```

### Methods

 * `cm.contractExists(address channel)`
   * Imported from _Utils.sol_.
   * True if a contract exists, false otherwise
 * `cm.getChannelWith(address partner)`
   * Get the address of channel with a partner
 * `cm.getChannelsAddresses()`
   * All the open channels
 * `cm.getChannelsParticipants()`
   * All participants in all channels
 * `cm.nettingContractsByAddress(address node_address)`
    * Get all channels that an address participates in
 * `cm.tokenAddress()`
    * The address of the channel token
 * Automatic getter:
   * `cm.contract_version()`

### Examples

```
> cm.contract_version().then(console.log)
0.2._

> cm.tokenAddress().then(console.log)
0x02cAf13e4b645b3dBf27f6Ae1647356A2410210F

> cm.getChannelsParticipants().then(console.log)
[ '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A',
  '0x1563915e194D8CfBA1943570603F7606A3115508' ]

> cm.getChannelsAddresses().then(console.log)
[ '0x6432ed34E54cCc4e3219e5EC65f398D02CFf2b89' ]
```

## Netting Channel interface

For the [_NettingChannelContract.sol_](https://github.com/raiden-network/raiden/blob/v0.2.0/raiden/smart_contracts/NettingChannelContract.sol) contract.

One of these contracts is created by the Channel Manager for each channel that is opened between a pair of nodes. It stores the deposited tokens and manages the return of net token balances to participants when the channel is settled. After the channel is settled, the contract self-destructs.

```
> var nc = new contracts.interface('0x6432ed34E54cCc4e3219e5EC65f398D02CFf2b89','abis/NettingChannelContract.json')
```

### Methods

 * `nc.addressAndBalance()`
   * Get the address and balance of both partners in a channel.
 * `nc.closed()`
   * Returns the block number for when the channel was closed.
 * `nc.closingAddress()`
   * Returns the address of the closing participant.
 * `nc.opened()`
   * Returns the block number for when the channel was opened.
 * `nc.settleTimeout()`
   * Returns the number of blocks until the settlement timeout.
 * `nc.tokenAddress()`
   * Returns the address of the token.
 * Automatic getters:
   * `nc.contract_version()`
   * `nc.data()`

### Examples

```
> nc.contract_version().then(console.log)
0.2._

> nc.tokenAddress().then(console.log)
0x02cAf13e4b645b3dBf27f6Ae1647356A2410210F

> nc.opened().then(console.log)
50

> nc.addressAndBalance().then(console.log)
Result {
  '0': '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A',
  '1': '100',
  '2': '0x1563915e194D8CfBA1943570603F7606A3115508',
  '3': '0',
  participant1: '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A',
  balance1: '100',
  participant2: '0x1563915e194D8CfBA1943570603F7606A3115508',
  balance2: '0' }

> nc.data().then(console.log)
Result {
  '0': '30',
  '1': '50',
  '2': '0',
  '3': '0x0000000000000000000000000000000000000000',
  '4': '0x02cAf13e4b645b3dBf27f6Ae1647356A2410210F',
  '5': false,
  settle_timeout: '30',
  opened: '50',
  closed: '0',
  closing_address: '0x0000000000000000000000000000000000000000',
  token: '0x02cAf13e4b645b3dBf27f6Ae1647356A2410210F',
  updated: false }
```

## Token interface

For the ERC20 [_Token.sol_](Token.sol) contract.

```
var token = new contracts.interface('0x02cAf13e4b645b3dBf27f6Ae1647356A2410210F','abis/Token.json')
```

### Methods

Standard ERC20 functions:

 * `token.allowance(address _owner, address _spender)`
 * `token.balanceOf(address _account)`
 * `token.decimals()`
 * `token.name()`
 * `token.symbol()`
 * `token.totalSupply()`

### Examples

```
> token.name().then(console.log)
Ben Token

> token.balanceOf('0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A').then(console.log)
249975
```
