const WorkerNodes = require('../../..');
const WorkerNodesVersion = require('../../../package.json').version;
const renderNodes = new WorkerNodes(require.resolve('./worker'), { maxWorkers: 1, maxTasksPerWorker: 1, autoStart: true });

module.exports = {
    test(pageDescription) {
        return renderNodes.call.renderHTML({ data: pageDescription });
    },

    version: () => WorkerNodesVersion
};