const zlib = require('zlib');

module.exports = {
    getDeflated: (msg = 'Hello!') => zlib.deflateSync(msg),
    getDeflatedInProperty: (msg = 'Hello!') => ({ info: 'deflate', data: zlib.deflateSync(msg) }),
    isBuffer: arg => Buffer.isBuffer(arg),
    sliceInHalf: buffer => buffer.slice(0, Math.floor(buffer.length / 2))
};