const ProcessPool = require('process-pool');

const pool = new ProcessPool({ processLimit: 1 });
const workerModulePath = require.resolve('./worker');

const renderHtml = pool.prepare(function(context) {
    const worker = require(context.workerModulePath);

    return function(data) {
        // the promise is used to keep the process active for a second, usually
        // promises would not be used for this purpose in a process pool.
        return worker.renderHTML(data);
    }
}, { workerModulePath }, { module: module });

module.exports = {
    test(pageDescription) {
        return renderHtml({ data: pageDescription })
    },

    version: () => require('process-pool/package.json').version
};