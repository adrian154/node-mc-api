const fetch = require("node-fetch");
const mcProtocol = require("./mc-protocol.js");

const APIStatus = {
    NO_ISSUES: 0,
    SOME_ISSUES: 1,
    UNAVAILABLE: 2
};

const statusMap = {
    "green": APIStatus.NO_ISSUES,
    "yellow": APIStatus.SOME_ISSUES,
    "red": APIStatus.UNAVAILABLE
};

const APIFetch = async (endpoint, options) => {
    const resp = await fetch(endpoint, options);
    if(resp.status != 200) throw new Error((await resp.json()).error);
    return await resp.json();
};

module.exports = {
    APIStatus: APIStatus,
    getAPIStatus: async () => {

        const resp = await APIFetch("https://status.mojang.com/check");
        return resp.map((status) => {
            
            let service = Object.keys(status)[0];
            return {
                service: service,
                status: statusMap[status[service]]
            };

        });

    },
    getNameHistory: async (uuid) => {
        return await APIFetch(`https://api.mojang.com/user/profiles/${uuid}/names`);
    },
    getProfile: async (playerName) => {
        
        const resp = await APIFetch(`https://api.mojang.com/profiles/minecraft`, {
            method: "POST",
            body: JSON.stringify([playerName]),
            headers: {
                "Content-Type": "application/json"
            }
        });

        if(resp.length !== 1) throw new Error("No player has that name, or the API sent an invalid response.");

        return {
            uuid: resp[0].id,
            legacy: Boolean(resp[0].legacy),
            demo: Boolean(resp[0].demo)
        };

    },
    getProfiles: async (playerNames) => {

        const resp = await APIFetch(`https://api.mojang.com/profiles/minecraft`, {
            method: "POST",
            body: JSON.stringify(playerNames),
            headers: {
                "Content-Type": "application/json"
            }
        });

        return Object.fromEntries(resp.map(elem => [elem.name, {
            uuid: elem.id,
            legacy: Boolean(elem.legacy),
            demo: Boolean(elem.demo)
        }]));

    },
    getSkins: async (uuid) => {

        const resp = await APIFetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
        const dataProp = resp.properties.find(prop => prop.name === "textures");
        if(!dataProp) throw new Error("Response from API was missing property \"textures\".");
        const data = JSON.parse(Buffer.from(dataProp.value, "base64").toString("ascii"));

        // the mere presence of `metadata` indicates a slim skin
        // this could change though...

        return {
            skinURL: data.textures.SKIN.url,
            slim: Boolean(data.textures.metadata),
            capeURL: (data.textures.CAPE || {}).url
        };

    },
    pingServer: mcProtocol.pingServer
};