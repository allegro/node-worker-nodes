const zlib = require('zlib');

module.exports = {
    getDeflated: (msg = 'Hello!') => zlib.deflateSync(msg),
    getDeflatedInProperty: (msg = 'Hello!') => ({ info: 'deflate', data: zlib.deflateSync(msg) }),
    isUint8Array: arg => arg instanceof Uint8Array,
    sliceInHalf: buffer => buffer.slice(0, Math.floor(buffer.length / 2))
};