# The Raiden client API

These modules provide an interface to [the Raiden client REST API](http://raiden-network.readthedocs.io/en/v0.2.0/rest_api.html).

Not everything provided by the Raiden client API has been implemented. But the following are useful.

I haven't versioned the API. It's currently all hard-coded as version 1.

All methods are asynchronous and return promises. This is a pain when using the node REPL, but I haven't found a clean way to make things synchronous for nice interactive use.

* [Initialising](#initialising)
* [Top-level methods](#top-level-methods)
  * [address()](#address)
  * [transfer()](#transfer)
* [Channels methods](#channels-methods)
  * [list()](#channelslist)
  * [info()](#channelsinfo)
  * [balance()](#channelsbalance)
  * [open()](#channelsopen)
  * [close()](#channelsclose)
  * [settle()](#channelssettle)
  * [deposit()](#channelsdeposit)
* [Tokens methods](#tokens-methods)
  * [list()](#tokenslist)
  * [register()](#tokensregister)
* [Events methods](#events-methods)
  * [network()](#eventsnetwork)
  * [token()](#eventstoken)
  * [channel()](#eventschannel)

## Initialising

The constructor for the `Raiden` class takes the URL of the Raiden node's API as an argument. You can create several of these if you have several nodes.

```
> var Raiden = require('./modules/raiden.js')
> var raiden = new Raiden('http://172.13.0.3:5001')
> var raiden_other = new Raiden('http://172.13.0.4:5001')
```

## Top-level methods

Defined in [_raiden.js_](raiden.js).

### address()

```
/**
 * Get the Ethereum account address associated with the node.
 * @returns {Promise} Resolves to the (Ethereum) address of the Raiden node we are connected to.
 */
```

Wrapper for [`GET /api/1/address`](http://raiden-network.readthedocs.io/en/v0.2.0/rest_api.html#querying-your-address).

```
> raiden.address().then(console.log)
{ our_address: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a' }

> raiden_other.address().then(console.log)
{ our_address: '0x1563915e194d8cfba1943570603f7606a3115508' }
```

### transfer()

```
/**
 * Transfer a token within a channel
 * @param {string} token - The token address.
 * @param {string} target - The address of the recipient.
 * @param {number} amount - Number of tokens to be transferred.
 * @returns {Promise}
 */
```

Wrapper for [`POST /api/1/transfers/<token_address>/<target_address>`](http://raiden-network.readthedocs.io/en/v0.2.0/rest_api.html#initiating-a-transfer).

```
> raiden.transfer('0x02caf13e4b645b3dbf27f6ae1647356a2410210f', '0x1563915e194d8cfba1943570603f7606a3115508', 60).then(console.log)
{ target_address: '0x1563915e194d8cfba1943570603f7606a3115508',
  amount: 60,
  identifier: 9439908204525595000,
  token_address: '0x02caf13e4b645b3dbf27f6ae1647356a2410210f',
  initiator_address: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a' }

> raiden_other.transfer('0x02caf13e4b645b3dbf27f6ae1647356a2410210f', '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a', 35).then(console.log)
{ target_address: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
  amount: 35,
  identifier: 421735800994075460,
  token_address: '0x02caf13e4b645b3dbf27f6ae1647356a2410210f',
  initiator_address: '0x1563915e194d8cfba1943570603f7606a3115508' }
```

## Channels methods

Defined in [_raiden-channels.js_](raiden-channels.js).

### channels.list()

```
/**
 * List all non-settled channels.
 * @returns {Promise} Resolves to a list of channel info (Netting contracts).
 */
```

Wrapper for [`GET /api/1/channels`](http://raiden-network.readthedocs.io/en/v0.2.0/rest_api.html#querying-all-channels).

```
> raiden.channels.list().then(console.log)
[ { partner_address: '0x1563915e194d8cfba1943570603f7606a3115508',
    balance: 75,
    reveal_timeout: 10,
    settle_timeout: 30,
    state: 'opened',
    channel_address: '0x6432ed34e54ccc4e3219e5ec65f398d02cff2b89',
    token_address: '0x02caf13e4b645b3dbf27f6ae1647356a2410210f' } ]
```

### channels.info()

```
/**
 * Get information about a specific channel.
 * @param {string} channel - Address of the channel (the Netting contract).
 * @returns {Promise} Resolves to information about a specific channel.
 */
```

Wrapper for [`GET /api/1/channels/<channel_address>`](http://raiden-network.readthedocs.io/en/v0.2.0/rest_api.html#querying-a-specific-channel).

```
> raiden.channels.info('0x6432ed34e54ccc4e3219e5ec65f398d02cff2b89').then(console.log)
{ partner_address: '0x1563915e194d8cfba1943570603f7606a3115508',
  balance: 75,
  reveal_timeout: 10,
  settle_timeout: 30,
  state: 'opened',
  channel_address: '0x6432ed34e54ccc4e3219e5ec65f398d02cff2b89',
  token_address: '0x02caf13e4b645b3dbf27f6ae1647356a2410210f' }

```

### channels.balance()

```
/**
 * Get my current balance in a specific channel.
 * @param {string} channel - Address of the channel (the Netting contract).
 * @returns {Promise} Resolves to my balance in the channel.
 */
```

Wrapper for [`GET /api/1/channels/<channel_address>`](http://raiden-network.readthedocs.io/en/v0.2.0/rest_api.html#querying-a-specific-channel) with some extra processing to extract only the token balance.

```
> raiden.channels.balance('0x6432ed34e54ccc4e3219e5ec65f398d02cff2b89').then(console.log)
75

> raiden_other.channels.balance('0x6432ed34e54ccc4e3219e5ec65f398d02cff2b89').then(console.log)
25
```

### channels.open()

```
/**
 * Open a channel between two nodes.
 * @param {string} partner - Address of counterpart in the channel.
 * @param {string} token - Address of token to be handled.
 * @param {number} balance - Initial balance to transfer into the channel.
 * @param {number} settle_timeout - Settlement timeout in blocks.
 * @returns {Promise}
 */
```

Wrapper for [`PUT /api/1/channels`](http://raiden-network.readthedocs.io/en/v0.2.0/rest_api.html#open-channel).

```
> raiden.channels.open('0x1563915e194D8CfBA1943570603F7606A3115508', '0x02cAf13e4b645b3dBf27f6Ae1647356A2410210F', 100, 30).then(console.log)
{ partner_address: '0x1563915e194d8cfba1943570603f7606a3115508',
  balance: 100,
  reveal_timeout: 10,
  settle_timeout: 30,
  state: 'opened',
  channel_address: '0x6432ed34e54ccc4e3219e5ec65f398d02cff2b89',
  token_address: '0x02caf13e4b645b3dbf27f6ae1647356a2410210f' }
```

This interacts with the blockchain so can take a while to complete.

### channels.close()

```
/**
 * Close a channel.
 * @param {string} channel - Address of the channel (the Netting contract).
 * @returns {Promise}
 */
```

Wrapper for [`PATCH /api/1/channels/<channel_address>`](http://raiden-network.readthedocs.io/en/v0.2.0/rest_api.html#close-channel).

```
> raiden.channels.close('0x6432ed34e54ccc4e3219e5ec65f398d02cff2b89').then(console.log)
{ partner_address: '0x1563915e194d8cfba1943570603f7606a3115508',
  balance: 125,
  reveal_timeout: 10,
  settle_timeout: 30,
  state: 'closed',
  channel_address: '0x6432ed34e54ccc4e3219e5ec65f398d02cff2b89',
  token_address: '0x02caf13e4b645b3dbf27f6ae1647356a2410210f' }

```

This interacts with the blockchain so can take a while to complete.

Once complete, the Raiden client automatically takes care of settling the channel (sending the net token balances to the participants) once the settlement period has expired.

### channels.settle() - untested

This is taken care of automatically by the client after a channel is closed, so this method appears redundant.

```
/**
 * Settle a channel.
 * @param {string} channel - Address of the channel (the Netting contract).
 * @returns {Promise}
 */
```

Wrapper for [`PATCH /api/1/channels/<channel_address>`](http://raiden-network.readthedocs.io/en/v0.2.0/rest_api.html#settle-channel).

### channels.deposit()

```
/**
 * Deposit further tokens into a channel
 * @param {string} channel - Address of the channel (the Netting contract).
 * @param {number} amount - Additional number of tokens to deposit.
 * @returns {Promise}
 */
```

Wrapper for [`PATCH /api/1/channels/<channel_address>`](http://raiden-network.readthedocs.io/en/v0.2.0/rest_api.html#deposit-to-a-channel).

```
> raiden.channels.deposit('0x6432ed34e54ccc4e3219e5ec65f398d02cff2b89', 50).then(console.log)
{ partner_address: '0x1563915e194d8cfba1943570603f7606a3115508',
  balance: 125,
  reveal_timeout: 10,
  settle_timeout: 30,
  state: 'opened',
  channel_address: '0x6432ed34e54ccc4e3219e5ec65f398d02cff2b89',
  token_address: '0x02caf13e4b645b3dbf27f6ae1647356a2410210f' }
```

This interacts with the blockchain so can take a while to complete.

## Tokens methods

Defined in [_raiden-tokens.js_](raiden-tokens.js).

### tokens.list()

```
/**
 * List all registered tokens.
 * @returns {Promise} Resolves to the list of tokens registered.
 */
```

Wrapper for [`GET /api/1/tokens`](http://raiden-network.readthedocs.io/en/v0.2.0/rest_api.html#querying-all-registered-tokens).

```
> raiden.tokens.list().then(console.log)
[ '0x02caf13e4b645b3dbf27f6ae1647356a2410210f' ]
```

### tokens.register()

```
/**
 * Register a token.
 * @param {string} token - address of the token contract.
 * @returns {Promise}
 */
```

Wrapper for [`PUT /api/1/tokens/<token_address>`](http://raiden-network.readthedocs.io/en/v0.2.0/rest_api.html#registering-a-token).

```
> raiden.tokens.register('0x02cAf13e4b645b3dBf27f6Ae1647356A2410210F').then(console.log)
{ channel_manager_address: '0x7f799b2c9fc03f10e8cabdb06bf916402bab1a8f' }
```

This interacts with the blockchain so can take a while to complete.

## Events methods

Defined in [_raiden-events.js_](raiden-events.js).

### events.network()

```
/**
 * List all network events.
 * @param {number} [block=0] - The starting block number, default zero.
 * @returns {Promise} Resolves to a list of all network events.
 */
```

Wrapper for [`GET /api/1/events/network`](http://raiden-network.readthedocs.io/en/v0.2.0/rest_api.html#querying-general-network-events).

```
> raiden.events.network().then(console.log)
[ { block_number: 80,
    token_address: '02caf13e4b645b3dbf27f6ae1647356a2410210f',
    event_type: 'TokenAdded',
    channel_manager_address: '7f799b2c9fc03f10e8cabdb06bf916402bab1a8f' } ]
```

### events.token()

```
/**
 * List all events concerning `token`.
 * @param {string} token - The token contract address.
 * @param {number} [block=0] - The starting block number, default zero.
 * @returns {Promise} Resolves to a list of events.
 */
```

Wrapper for [`GET /api/1/events/tokens/<token_address>`](http://raiden-network.readthedocs.io/en/v0.2.0/rest_api.html#querying-token-network-events).

```
> raiden.events.token('0x02cAf13e4b645b3dBf27f6Ae1647356A2410210F').then(console.log)
[ { participant1: '19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
    block_number: 172,
    netting_channel: '6432ed34e54ccc4e3219e5ec65f398d02cff2b89',
    participant2: '1563915e194d8cfba1943570603f7606a3115508',
    event_type: 'ChannelNew',
    settle_timeout: 30 } ]

> raiden.events.token('0x02cAf13e4b645b3dBf27f6Ae1647356A2410210F', 200).then(console.log)
[]
```

### events.channel()

```
/**
 * List all events concerning `channel`, starting from `block` (optional).
 * @param {string} channel - The channel (Netting contract) address.
 * @param {number} [block=0] - The starting block number, default zero.
 * @returns {Promise} Resolves to a list of events.
 */
```

Wrapper for [`GET /api/1/events/channels/<channel_registry_address>`](http://raiden-network.readthedocs.io/en/v0.2.0/rest_api.html#querying-channel-events).

```
> raiden.events.channel('0x6432ed34e54ccc4e3219e5ec65f398d02cff2b89').then(console.log)
[ { block_number: 176,
    participant: '19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
    event_type: 'ChannelNewBalance',
    balance: 100,
    token_address: '02caf13e4b645b3dbf27f6ae1647356a2410210f' },
  { block_number: 347,
    participant: '19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
    event_type: 'ChannelNewBalance',
    balance: 150,
    token_address: '02caf13e4b645b3dbf27f6ae1647356a2410210f' },
  { block_number: 536,
    event_type: 'ChannelClosed',
    closing_address: '19e7e376e7c213b7e7e7e46cc70a5dd086daff2a' },
  { node_address: '1563915e194d8cfba1943570603f7606a3115508',
    event_type: 'TransferUpdated',
    block_number: 538 },
  { block_number: 569, event_type: 'ChannelSettled' },
  { block_number: 233,
    target: '1563915e194d8cfba1943570603f7606a3115508',
    amount: 60,
    identifier: 9439908204525595000,
    event_type: 'EventTransferSentSuccess' },
  { block_number: 267,
    initiator: '1563915e194d8cfba1943570603f7606a3115508',
    event_type: 'EventTransferReceivedSuccess',
    amount: 35,
    identifier: 421735800994075460 } ]

 raiden.events.channel('0x6432ed34e54ccc4e3219e5ec65f398d02cff2b89', 500).then(console.log)
[ { block_number: 536,
    event_type: 'ChannelClosed',
    closing_address: '19e7e376e7c213b7e7e7e46cc70a5dd086daff2a' },
  { node_address: '1563915e194d8cfba1943570603f7606a3115508',
    event_type: 'TransferUpdated',
    block_number: 538 },
  { block_number: 569, event_type: 'ChannelSettled' } ]
```
