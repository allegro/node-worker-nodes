const WorkerPool = require('node-worker-pool');

const workerPool = new WorkerPool(1, process.execPath, [require.resolve('./worker.js')], {});

module.exports = {
    test(pageDescription) {
        return workerPool.sendMessage({ data: pageDescription }).then(result => result);
    },

    version: () => require('node-worker-pool/package.json').version
};