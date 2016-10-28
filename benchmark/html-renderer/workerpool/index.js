const workerpool = require('workerpool');

// create a worker pool using an external worker script
const pool = workerpool.pool(__dirname + '/worker.js');

module.exports = {
    test(pageDescription) {
        return pool.exec('renderHTML', [{ data: pageDescription }])
    },

    version: () => require('workerpool/package.json').version
};
