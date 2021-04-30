const test = require('ava');
const fs = require('fs');

const WorkerNodes = require('../');
const { fixture, wait } = require('./utils');

test('should generate heap snapshot result file', async (t) => {
    // given
    const workerNodes = new WorkerNodes(fixture('echo-function-async'), { lazyStart: true });
    await workerNodes.ready();

    // when
    workerNodes.takeSnapshot();
    await wait(1500);

    const result = fs.readdirSync(process.cwd()).find(name => name.includes('.heapsnapshot'));
    t.truthy(result);
    fs.unlinkSync(result);
});


test('should generate heap profiler result file', async (t) => {
    // given
    const workerNodes = new WorkerNodes(fixture('echo-function-async'), { lazyStart: true });
    await workerNodes.ready();

    // when
    workerNodes.profiler(200);
    await wait(500);

    const result = fs.readdirSync(process.cwd()).find(name => name.includes('.cpuprofile'));

    t.truthy(result);
    fs.unlinkSync(result);
});
