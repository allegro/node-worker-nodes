const test = require('ava');
const fs = require('fs');

const WorkerNodes = require('../');
const { fixture, wait } = require('./utils');

test('should generate heap snapshot result file', async (t) => {
    // given
    const workerNodes = new WorkerNodes(fixture('echo-function-async'), { lazyStart: true });
    await workerNodes.ready();
    await workerNodes.call('hello!');

    // when
    workerNodes.takeSnapshot();
    await wait(1500);

    const result = fs.readdirSync(process.cwd()).find(name => name.includes('.heapsnapshot'));
    t.truthy(result);
    t.true(result.length > 0)
    fs.unlinkSync(result);
});

test('should generate heap profiler result file', async (t) => {
    // given
    const workerNodes = new WorkerNodes(fixture('echo-function-async'), { lazyStart: true });
    await workerNodes.ready();

    // when
    workerNodes.profiler(200);

    await workerNodes.call('hello!');

    await wait(500);

    const result = fs.readdirSync(process.cwd()).find(name => name.includes('.cpuprofile'));

    t.truthy(result);
    t.true(result.length > 0)
    fs.unlinkSync(result);
});
