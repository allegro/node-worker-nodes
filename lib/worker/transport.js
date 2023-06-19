const EventEmitter = require('events');
const msgpack = require("msgpack-lite");

const BUFFER_INITIAL_SIZE = 1024 * 1024; // 1MB
const BUFFER_GROW_RATIO = 1.5;

class Transport extends EventEmitter {
    constructor(pipe) {
        super();

        let buffer = Buffer.alloc(BUFFER_INITIAL_SIZE);
        let bufferPointer = 0;

        this.pipe = pipe;

        const processChunk = dataChunk => {
            // extend the buffer to ensure that it is
            // large enough to store the incoming chunk
            while (bufferPointer + dataChunk.byteLength > buffer.byteLength) {
                const newBuffer = Buffer.alloc(buffer.byteLength * BUFFER_GROW_RATIO);
                buffer.copy(newBuffer);
                buffer = newBuffer;
            }

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

        pipe.on('error', error => {
            // This might happen when parent is already exited and we try to send it messages
            // It can be commonly seen in tests
            if (error.code === 'ENOENT') {
                return;
            }
            console.error(error);
        });
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