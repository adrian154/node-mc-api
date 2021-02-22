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

const parseParams = async (host, options) => {

    let port = options?.port ?? 25565;
    if(!net.isIP(host)) {
        try {
            const records = await dns.resolveSrv(`_minecraft._tcp.${host}`);
            if(records.length > 0) {
                host = records[0].name;
                port = records[0].port;
            }
        } catch(error) {
            // no SRV record? no problem!
        }  
    }

    return {
        host: host,
        port: port,
        timeout: options?.timeout ?? 5000
    };

};

// UTF-16LE to UTF-16BE, since UTF-16BE is not supported by Node... or any other sane person
const toUTF16LE = (str) => {
    const buffer = Buffer.from(str, "utf16le");
    for(let i = 0; i < buffer.length; i += 2) {
        [buffer[i + 1], buffer[i]] = [buffer[i], buffer[i + 1]];
    }
    return buffer;
};

const fromUTF16BE = (buffer) => {
    for(let i = 0; i < buffer.length; i += 2) {
        [buffer[i + 1], buffer[i]] = [buffer[i], buffer[i + 1]];
    }
    return buffer.toString("utf16le");
};

const makeLegacyHandshake = (host, port) => {
    
    const builder = new BufferBuilder();
    builder.putByte(0xFE); // identifier for a ping
    builder.putByte(0x01); // SLP payload
    builder.putByte(0xFA); // identifies packet as plugin message
    
    // put the string
    const str = "MC|PingHost";
    builder.putUShortBE(str.length);
    builder.putBuffer(toUTF16LE(str));

    // put rest of data
    const innerBuilder = new BufferBuilder();
    innerBuilder.putByte(0x00);
    innerBuilder.putUShortBE(host.length);
    innerBuilder.putBuffer(toUTF16LE(host));
    innerBuilder.putUIntBE(port);

    const inner = innerBuilder.build();
    builder.putUShortBE(inner.length);
    builder.putBuffer(inner);
    return builder.build();

};

// read field within legacy response
const readLegacyField = reader => {
    const start = reader.offset;
    let end = start;
    do {
        if(reader.buffer.readUInt8(end) == 0x00 && reader.buffer.readUInt8(end + 1) == 0x00) break; 
        end++;
    } while(end < reader.buffer.length);
    reader.move(end - start + 2);
    return fromUTF16BE(reader.buffer.slice(start, end));
};

const readLegacyResponse = async (socket) => {

    // the closest thing to a packet header that we'll get
    const header = new BufferReader(await socket.read(3));
    if(header.readByte() != 0xFF) throw new Error("Invalid packet");
    const length = header.readUInt16BE();

    // read string
    // ASSUME that all codepoints are exactly 2 bytes
    const payload = await socket.read(length * 2);
    const reader = new BufferReader(payload);

    // skip first 3 chars, they are meaningless
    reader.readBytes(6);

    return {
        version: {
            protocol: Number(readLegacyField(reader)),
            name: readLegacyField(reader)
        },
        description: {
            text: readLegacyField(reader)
        },
        players: {
            online: readLegacyField(reader),
            max: readLegacyField(reader)
        }
    };

};

module.exports = {
    pingServer: async (inHost, options) => {

        // defaults
        const {host, port, timeout} = await parseParams(inHost, options);

        // open socket
        const socket = new SocketWrapper(host, port, timeout);
        await socket.waitConnect();

        // ping
        socket.write(makeHandshakePacket(host, port, HandshakeState.PING));
        socket.write(makeRequestPacket());
        return await readPacket(socket);

    },
    legacyPing: async (inHost, options) => {

        // same old, same old...
        const {host, port, timeout} = await parseParams(inHost, options);

        // connect
        const socket = new SocketWrapper(host, port, timeout);
        await socket.waitConnect();

        // send ping packet
        socket.write(makeLegacyHandshake(host, port));
        return await readLegacyResponse(socket);

    }
};