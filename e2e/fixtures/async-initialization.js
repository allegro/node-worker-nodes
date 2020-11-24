const sendWorkerMessage = require('../../lib/util/send-worker-message');

let result = '';

setTimeout(() => {
    result = 'result';
    sendWorkerMessage('ready');
}, 200);

module.exports = {
    result: () => result,
};