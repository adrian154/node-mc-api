const dns = require("dns").promises;
const net = require("net");
const { BufferReader, BufferBuilder, SocketWrapper } = require("./protocol-types");

const PacketID = {
    HANDSHAKE: 0,
    REQUEST: 0,
    RESPONSE: 0,
    PING: 1,
}; Object.freeze(PacketID);

const HandshakeState = {
    PING: 1,
    LOGIN: 2
}; Object.freeze(HandshakeState);

// helper methods
const makePacket = (id, buffer) => {
    
    const innerPacketBuilder = new BufferBuilder();
    innerPacketBuilder.putVarInt(id);
    if(buffer) innerPacketBuilder.putBuffer(buffer);
    const innerPacket = innerPacketBuilder.build();

    const fullPacket = new BufferBuilder();
    fullPacket.putVarInt(innerPacket.length);
    fullPacket.putBuffer(innerPacket);
    return fullPacket.build();

};

const makeHandshakePacket = (hostname, port, targetState) => {
    const builder = new BufferBuilder();
    builder.putVarInt(-1);          // protocol version: VarInt, -1 indicates request for status
    builder.putString(hostname);    // hostname that was used to connect
    builder.putUShort(port);        // port that was used to connect
    builder.putVarInt(targetState); // state to transition to
    return makePacket(PacketID.HANDSHAKE, builder.build());
};

const makeRequestPacket = () => {
    return makePacket(PacketID.REQUEST);
};

// decoders
const decodePingResponse = (reader) => JSON.parse(reader.readString());

const Decoders = {
    [PacketID.RESPONSE]: decodePingResponse
}; Object.freeze(Decoders);

const decodePacket = async (reader) => {
    const id = await reader.readVarInt();
    if(!Decoders[id]) throw new Error("No decoder registered for packet of type " + id);
    return Decoders[id](reader);
};

// read packet (general)
const readPacket = async (socket) => {
    const length = await socket.readVarInt();
    return decodePacket(new BufferReader(await socket.read(length)));
};

module.exports = {
    pingServer: async (host, options) => {

        // defaults
        const port = options?.port ?? 25565;
        const timeout = options?.timeout ?? 5000;

        // resolve everything
        if(!net.isIP(host)) {
            try {
                const records = await dns.resolveSrv(`_minecraft._tcp.${host}`);
                if(records && records.length > 0) {
                    host = records[0].name;
                    port = records[0].port;
                }
            } catch(error) {
                // keep this a secret...
            }
        }

        // open socket
        const socket = new SocketWrapper(host, port, timeout);
        await socket.waitConnect();

        // ping
        socket.write(makeHandshakePacket(host, port, HandshakeState.PING));
        socket.write(makeRequestPacket());
        return await readPacket(socket);

    }
};