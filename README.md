# minecraft-api

Mojang API wrapper for Node.

# Initialization

None needed. This wrapper is completely stateless.

# Usage

All functions are asynchronous, meaning they will immediately return promises. The "returns" value indicates the value which the promise will be resolved with.

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
