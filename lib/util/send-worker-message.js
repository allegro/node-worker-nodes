const { parentPort, threadId } = require('worker_threads');

module.exports = (message) => threadId === 0 ? process.send(message) : parentPort.postMessage(message);