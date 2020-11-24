const test = require('ava');

const WorkerNodes = require('../');
const { fixture } = require('./utils');

test('should not mark worker as ready until module fully initialized', t => {
    // given
    const workerNodes = new WorkerNodes(fixture('async-initialization'), {
        maxWorkers: 1,
        asyncWorkerInitialization: true,
        autoStart: true
    });

    // then
    t.falsy(workerNodes.pickWorker());
});

test('should correctly handle task after initialization', async t => {
    // given
    const workerNodes = new WorkerNodes(fixture('async-initialization'), {
        maxWorkers: 1,
        asyncWorkerInitialization: true,
        autoStart: true
    });

    // when 
    const result = await workerNodes.call.result();

    // then
    t.is(result, 'result');
});
