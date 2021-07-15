# node-mc-api

Mojang API wrapper for Node.

# Changelog

See [CHANGELOG.md](https://github.com/adrian154/minecraft-api/blob/master/CHANGELOG.md).

# General usage

To use the API, just require this module. 

All functions are asynchronous, meaning they will immediately return promises. The "returns" value indicates the value which the promise will be resolved with.

# Minecraft protocol functions

## `API.pingServer(host, options)`

**Parameters**:
* `host`: `String`, the hostname of the server (domain or IP)
* `options`: **Optional**: Object with these fields:
    * `port`: Port the server is to be pinged on. By default, 25565.
    * `timeout`: Milliseconds of inactivity before the connection is automatically terminated. By default, 5000 ms.

**Returns**: Information about the server.

Example response:

```
{
    version: {name: String, protocol: Number},
    players: {max: Number, online: Number},
    description: {text: String},
    favicon: String
}
```

**Notes**
* `protocol` is a [protocol version number](https://wiki.vg/Protocol_version_numbers)
* `favicon` is a image data URL.
* Servers could potentially send *any JSON* as a response. This wrapper does not verify that the fields you are interested in will be present.

## `API.legacyPing(host, options)`

**Parameters**
* Identical to `API.pingServer()`

**Returns**: Information about the server.

Example response:

```
{
    version: {name: String, protocol: Number},
    description: {text: String},
    players: {online: Number, max: Number}
}
```

**Notes**:
* This protocol was used in Minecraft 1.6 and all other versions prior to the Netty rewrite. It is not supported on many modern servers, use at your own risk.
* The data returned through this method is limited (no favicon, other things may be missing)

# Mojang API

## `API.getAPIStatus()`

**Parameters**: None

**Returns**: An object mapping the name of each Mojang service to a number indicating its health. The meaning of that number is determined by the `API.APIStatus` constant.

```
const APIStatus = {
    NO_ISSUES: 0,
    SOME_ISSUES: 1,
    UNAVAILABLE: 2
};
```

Example response:

```
[
    {service: 'minecraft.net', status: 0},
    {service: 'session.minecraft.net', status: 0},
    {service: 'account.mojang.com', status: 0},
    {service: 'authserver.mojang.com', status: 0},
    {service: 'sessionserver.mojang.com', status: 2},
    {service: 'api.mojang.com', status: 0},
    {service: 'textures.minecraft.net', status: 0},
    {service: 'mojang.com', status: 0}
]
```

## `API.getNameHistory(uuid)`

**Parameters**:
* `uuid`: `String`, the UUID of the player

**Returns**: The name history for that player

Example response:

```
[
    {name: "currentname"},
    {name: "pastname1", changedToAt: <timestamp...>},
    {name: "pastname2", changedToAt: <timestamp...>}
]
```

## `API.getProfile(playerName)`

**Parameters**:
* `playerName`: `String`, the name of the player

**Returns**: The profile of that player

Example response:

```
{
    uuid: 'dd59a2b9083e49dca6c24c7b7997dce8',
    legacy: false,
    demo: false
}
```

## `API.getProfiles(playerNames)`

**Parameters**:
* `playerNames`: `Array`, list of player names

**Returns**: An object mapping each name to a profile

Example response:

```
{
    peihl: {
        uuid: 'eda45f9b5dc945858fbbedf695cb28b3',
        legacy: false,
        demo: false
    },
    _ewww_: {
        uuid: '701d185eb54c40a2acff363ce78512c0',
        legacy: false,
        demo: false
    }
}
```

This API can retrieve up to 10 profiles in a single request. Use this if you need to look up several profiles in bulk as it can help you avoid ratelimiting.

## `API.getSkins(uuid)`

**Parameters**:
* `uuid`: `String`, the UUID of the player

**Returns**: The URLs of the player's skin and cape.

Example response:

```
{
    skinURL: 'http://textures.minecraft.net/texture/cd4a2f2f3824e323be244ffe86c9b26bc81bc9194099f370a92af1b40cec3d58',
    slim: false,
    capeURL: undefined
}
```

`capeURL` may be undefined if the player does not have a cape. `slim` indicates whether the player's skin is "slim" (3-pixel arms) or wide (4-pixel arms).

# `MojangClient`

APIs that require authentication are accessed through instances of `MojangClient`.

When an API call fails an error is thrown.

# Constructor

`MojangClient()` - Nothing to say here

# Properties

`MojangClient.clientToken`: The client token  returned by Yggdrasil

`MojangClient.accessToken`: The JWT access token returned by Yggdrasil

`MojangClient.tokenInfo`: The actual contents of the returned access token
* `iat`: The timestamp at which the token was issued
* `exp`: The timestamp at which the token expires

`MojangClient.profile`: 
* `id`: The player's UUID
* `name`: The player's username

# Methods

## `MojangClient.login(username, password)`

**Parameters:**
* `username`: String - the account email or username for unmigrated accounts.
* `password`: String - the password.

Obtains an access token from the Mojang servers. A call to this method must have succeeded at least once to access any of the other APIs included under `MojangClient`.

Returns a `Promise` that resolves to undefined when an access token is obtained.

## `MojangClient.signout()`

**Parameters:** None

Invalidates the current access token.

Returns a `Promise` that resolves to undefined when the access token is invalidated.

## `MojangClient.resetSkin()` 

**Parameters:** None

Resets the player's skin to the default one.

Returns a `Promise` that resolves to undefined when the skin is reset.

## `MojangClient.uploadSkin(imageData, slim)`

**Parameters:** 
* `imageData`: Buffer - the skin data (should be a PNG)
* `slim`: Boolean - `true` if the skin has 3-pixel wide arms, `false` if the skin has 4-pixel wide arms

Uploads and changes the player's skin.

Returns a `Promise` that resolves to undefined when the skin is uploaded.

## `MojangClient.checkNameAvailable(name)`

**Parameters:**
* `name`: String - the name to check

Returns a `Promise` that resolves to `true` if the name is available and `false` if not. This method will also indicate if a name is blocked by Mojang, e.g. if the name includes profanity.

## `MojangClient.changeName(name)`

**Parameters:**
* `name`: String - the new name

Changes the player's name.

Returns a `Promise` that resolves to undefined when the player's name is changed.