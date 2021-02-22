const servers = [
    "play.skittlemc.com",
    "pixel.mc-complex.com",
    "ubermc.net",
    "fadecloud.com",
    "play.minesaga.org",
    "play.skycade.net",
    "hypixel.net",
    "play.castiamc.com",
    "mc-gtm.net",
    "mc.good-gaming.com",
    "pokecentral.org",
    "mcsl.nemegaming.org",
    "play.universemc.us",
    "play.jartexnetwork.com",
    "play.applecraft.org",
    "mc.cosmicmc.net",
    "mc.arkhamnetwork.org",
    "mc-central.net",
    "pvp.desteria.com",
    "mc.performium.net",
    "mc.snapcraft.net",
    "brawl.com",
    "play.gotpvp.com",
    "play.thesquadmc.net",
    "mc.momentonetwork.net",
    "play.skykingdoms.net",
    "play.pika-network.eu",
    "play.extremecraft.net"
];

const MC = require("./index.js");

(async () => {
    let successful = 0;
    for(let server of servers) {
        try {
            const ping = await MC.pingServer(server);
            successful++;
            console.log("successful: " + server + ", protocol=" + ping.version.protocol);
        } catch(error) {
            console.log("!!! FAILURE: " + server + ", error=" + error);
        }
    }
    console.log("===== TEST RESULTS: " + successful + "/" + servers.length);
})();