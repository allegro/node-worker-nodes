const { parentPort } = require('worker_threads');

module.exports = (message) => parentPort.postMessage(message);