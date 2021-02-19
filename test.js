const Minecraft = require("./index.js");
(async () => {
    const mcprotocol = require("./mc-protocol.js");
    mcprotocol.pingServer("us.mineplex.com", 25565);
})();