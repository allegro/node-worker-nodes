const EventEmitter = require('events');
const msgpack = require("msgpack-lite");

class Transport extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.socket.on('error', Transport._ignorePipeErrors);

    this.decodeStream = msgpack.createDecodeStream();
    this.socket.pipe(this.decodeStream)
               .on('data', message => this.emit('message', message));
  }


  send(message) {
    const encodeStream = msgpack.createEncodeStream()
                                .on('data', data => this.socket.write(data));
    encodeStream.write(message);
    encodeStream.end();
  }

  static _ignorePipeErrors(err) {
    if (!['EPIPE', 'ECONNRESET'].includes(err.code)) {
      throw err;
    }
  }
}

module.exports = Transport;