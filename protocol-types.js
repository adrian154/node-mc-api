const net = require("net");

// tiny wrapper to buffer things
const SocketWrapper = class {

    constructor(host, port, timeout) {
        
        this.socket = new net.Socket();
        this.socket.setTimeout(timeout);
        this.buffer = null;

        this.socket.on("timeout", () => {
            this.socket.destroy();
        });

        this.socket.on("close", () => {

        
            if(this.rejectConnect) this.rejectConnect(new Error("Socket closed"));
         
            if(this.bytesToRead) {
                if(this.buffer && this.bytesToRead <= this.buffer.length) {
                    return this.buffer.slice(0, this.bytesToRead);
                } else {
                    this.rejectRead(new Error("Socket closed before enough data could be received"));
                }
            }

        });

        this.socket.on("data", (data) => {

            if(this.buffer)
                this.buffer = Buffer.concat([this.buffer, data]);
            else
                this.buffer = data;

            if(this.bytesToRead && this.buffer.length >= this.bytesToRead) {
                const result = this.buffer.slice(0, this.bytesToRead);
                const remaining = this.buffer.slice(this.bytesToRead, this.buffer.length);
                this.buffer = remaining;
                this.bytesToRead = null;
                this.resolveRead(result);
            }

        });

        this.socket.on("error", (error) => {
            if(this.rejectConnect) this.rejectConnect(error);
            if(this.bytesToRead) this.rejectRead(error);
        });

        this.socket.connect(port, host, () => {
            if(this.resolveConnect) this.resolveConnect();
        });

    }

    write(data) {
        this.socket.write(data);
    }

    async waitConnect() {
        
        if(this.resolveConnect) throw new Error("waitConnect() already called");
        if(this.socket.connected) return;

        return new Promise((resolve, reject) => {
            this.resolveConnect = resolve;
            this.rejectConnect = reject;
        });

    }

    async read(count) {

        if(this.bytesToRead) throw new Error("read() already called. Please `await` for that first request to finish.");
        if(this.buffer && this.buffer.length >= count) {
            const data = this.buffer.slice(0, count);
            this.buffer = this.buffer.slice(count, this.buffer.length);
            return data;
        }

        this.bytesToRead = count;
        return new Promise((resolve, reject) => {
            this.resolveRead = resolve;
            this.rejectRead = reject;
        });

    }

    async readVarInt() {

        let offset = 0, result = 0;
        let curByte;

        do {
            curByte = (await this.read(1)).readUInt8();
            result |= (curByte & 0b01111111) << (7 * offset);
            offset++;
        } while(curByte & 0b10000000 && offset < 5);

        return result;

    }

};

// A wrapper for buffers
const BufferReader = class {

    constructor(buffer) {
        this.buffer = buffer;
        this.offset = 0;
    }

    // increase offset, return OLD value
    // makes code much more compact
    move(amount) { 
        const old = this.offset;
        this.offset += amount;
        return old;
    }

    // read methods
    readBytes(count) { return this.buffer.slice(this.move(count), this.offset); }
    readByte()       { return this.buffer.readUInt8(this.move(1)); }
    readUInt16()     { return this.buffer.readUInt16LE(this.move(2)); }
    readUInt16BE()   { return this.buffer.readUInt16BE(this.move(2)); }
    readInt32()      { return this.buffer.readInt32LE(this.move(4)); }
    readUInt32()     { return this.buffer.readUInt32LE(this.move(4)); }
    readUInt64()     { return this.buffer.readBigInt64LE(this.move(8)); }
    
    // protocol reads
    readVarInt() {

        let offset = 0, result = 0;
        let curByte;

        do {
            curByte = this.readByte();
            result |= (curByte & 0b01111111) << (7 * offset);
            offset++;
        } while(curByte & 0b10000000 && offset < 5);

        return result;

    }

    readString() {
        const strLen = this.readVarInt();
        return this.readBytes(strLen).toString("utf-8");
    }

};

const BufferBuilder = class {

    constructor() {
        this.buffers = [];
    }

    build() {
        return Buffer.concat(this.buffers);
    }

    // put methods
    putBuffer(buffer, start)  { if(start) this.buffers.unshift(buffer); else this.buffers.push(buffer); }
    putByte(value, start)     { const buf = Buffer.alloc(1); buf.writeUInt8(value); this.putBuffer(buf, start); }
    putUShort(value, start)   { const buf = Buffer.alloc(2); buf.writeUInt16LE(value); this.putBuffer(buf, start); }
    putUShortBE(value, start) { const buf = Buffer.alloc(2); buf.writeUInt16BE(value); this.putBuffer(buf, start); }
    putUIntBE(value, start)   { const buf = Buffer.alloc(4); buf.writeUInt32BE(value); this.putBuffer(buf, start); }

    putVarInt(value, start) {

        const builder = new BufferBuilder();
        
        do {
            let toWrite = value & 0b01111111;
            value >>>= 7;
            if(value != 0) toWrite |= 0b10000000;
            builder.putByte(toWrite);
        } while(value != 0);

        this.putBuffer(builder.build(), start);

    }

    putString(value, start) {
        const builder = new BufferBuilder();
        builder.putVarInt(value.length);
        builder.putBuffer(Buffer.from(value, "utf-8"));
        this.putBuffer(builder.build(), start);
    }

};

module.exports = {
    SocketWrapper: SocketWrapper,
    BufferReader: BufferReader,
    BufferBuilder: BufferBuilder
};