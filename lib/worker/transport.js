const EventEmitter = require('events');
const msgpack = require("msgpack-lite");

class Transport extends EventEmitter {
    constructor(pipe, maxMessageSize) {
        super();

        let buffer = Buffer.alloc(maxMessageSize + 512 * 1024);
        let bufferPointer = 0;

        this.pipe = pipe;

        const processChunk = dataChunk => {
            bufferPointer += dataChunk.copy(buffer, bufferPointer);
            checkBuffer();
        };

        const checkBuffer = () => {
            const headerLength = Uint32Array.BYTES_PER_ELEMENT;
            const bodyLength = new Uint32Array(buffer.buffer, 0, 1)[0];
            const totalMsgLength = headerLength + bodyLength;

            if (bufferPointer > headerLength && bufferPointer >= totalMsgLength) {
                const message = msgpack.decode(buffer.slice(headerLength, headerLength + bodyLength));

                this.emit('message', message);

                // copy remaining chunk to the start of the buffer and reset pointers
                buffer.copy(buffer, 0, totalMsgLength, bufferPointer);
                bufferPointer = bufferPointer - totalMsgLength;

                if (bufferPointer >= headerLength) {
                    checkBuffer();
                }
            }
        };

        pipe.on('error', console.error);
        pipe.on('data', processChunk);
    }

    send(message) {
        const serializedMessage = msgpack.encode(message);
        const header = new Uint32Array([ serializedMessage.byteLength ]);

        this.pipe.write(Buffer.from(header.buffer));
        this.pipe.write(serializedMessage);
    }
}

module.exports = Transport;