const Minecraft = require("./index.js");
(async () => {
    const profile = await Minecraft.getProfile("peihl");
    console.log(await Minecraft.getSkins(profile.uuid));
})();