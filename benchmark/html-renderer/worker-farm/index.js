const WorkerFarm = require('worker-farm');
const renderer = WorkerFarm({
    maxConcurrentWorkers: 1,
    maxConcurrentCallsPerWorker: 1,
    autoStart: true
}, require.resolve('./worker'), ['renderHTML']);

module.exports = {
    test(pageDescription) {
        return new Promise(resolve => {
            renderer.renderHTML({ data: pageDescription }, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    },

    version: () => require('worker-farm/package.json').version
};