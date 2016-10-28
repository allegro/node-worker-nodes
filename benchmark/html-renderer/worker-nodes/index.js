const WorkerNodes = require('worker-nodes');
const renderNodes = new WorkerNodes(require.resolve('./worker'), { maxWorkers: 1, maxTasksPerWorker: 1, autoStart: true });

module.exports = {
    test(pageDescription) {
        return renderNodes.call.renderHTML({ data: pageDescription });
    },

    version: () => require('worker-nodes/package.json').version
};