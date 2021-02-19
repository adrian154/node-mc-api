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
    pingServer: async (host, port) => {

        // defaults
        port = port || 25565;
    
        // do the ping
        const socket = new SocketWrapper(host, port);
        await socket.waitConnect();

        socket.write(makeHandshakePacket(host, port, HandshakeState.PING));
        socket.write(makeRequestPacket());

        return await readPacket(socket);

    }
};