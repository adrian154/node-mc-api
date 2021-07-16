const fetch = require("node-fetch");
const mcProtocol = require("./mc-protocol.js");
const FormData = require("form-data");

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
    if(resp.status === 204) return;
    if(resp.status != 200) throw new Error((await resp.json()).error);
    return resp.json();
};

class MojangClient {

    constructor() {
        // nothing actually needs to be done here :)
    }

    async makeAuthedRequest(endpoint, options = {}) {
        await this.checkToken();
        options.headers = options.headers ?? {};
        options.headers["Authorization"] = "Bearer " + this.accessToken;
        return APIFetch(endpoint, options);
    }

    async resetSkin() {
        await this.makeAuthedRequest(`https://api.mojang.com/user/profile/${encodeURIComponent(this.profile.id)}/skin`, {method: "DELETE"});
    }

    async uploadSkin(imageData, slim) {

        const form = new FormData();
        form.append("variant", slim ? "slim" : "classic");
        form.append("file", imageData, {contentType: "image/png", filename: "skin.png"});

        await this.makeAuthedRequest("https://api.minecraftservices.com/minecraft/profile/skins", {
            method: "POST",
            body: form
        });
    }

    async changeName(name) {
        // discard the result, error is thrown upon failure
        await this.makeAuthedRequest(`https://api.minecraftservices.com/minecraft/profile/name/${encodeURIComponent(name)}`, {method: "PUT"});
    }

    // TODO: Verify that this actually works
    async checkNameAvailable(name) {
        const resp = await this.makeAuthedRequest(`https://api.minecraftservices.com/minecraft/profile/name/${encodeURIComponent(name)}/available`);
        return resp.status === "AVAILABLE";
    }

    // make sure token's still fresh
    // TODO: Verify that this actually works
    async checkToken() {

        if(Date.now() / 1000 >= this.tokenInfo.exp) {

            const resp = await APIFetch("https://authserver.mojang.com/authenticate", {
                method: "POST",
                body: JSON.stringify({
                    accessToken: this.accessToken,
                    clientToken: this.clientToken
                }),
                headers: {
                    "Content-Type": "application/json"
                }
            });
            
            this.accessToken = resp.accessToken;
        
        }

    }

    async login(username, password) {

        const resp = await APIFetch(`https://authserver.mojang.com/authenticate`, {
            method: "POST",
            body: JSON.stringify({
                agent: {
                    name: "Minecraft",
                    version: 1
                },
                username: username,
                password: password,
                requestUser: true
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });

        this.user = resp.user;
        this.clientToken = resp.clientToken;
        this.accessToken = resp.accessToken;
        this.tokenInfo = JSON.parse(Buffer.from(this.accessToken.split(".")[1], "base64").toString("utf-8"));
        this.profile = resp.selectedProfile;
        
    }

    // invalidate access token
    async signout() {
        return APIFetch(`https://authserver.mojang.com/invalidate`, {
            method: "POST",
            body: JSON.stringify({
                accessToken: this.accessToken,
                clientToken: this.clientToken
            }),
            headers: {
                "Content-Type": "application/json"
            }
        })
    }

};

module.exports = {
    APIStatus,
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
        return await APIFetch(`https://api.mojang.com/user/profiles/${encodeURIComponent(uuid)}/names`);
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

        const resp = await APIFetch(`https://sessionserver.mojang.com/session/minecraft/profile/${encodeURIComponent(uuid)}`);
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
    pingServer: mcProtocol.pingServer,
    legacyPing: mcProtocol.legacyPing,
    MojangClient
};