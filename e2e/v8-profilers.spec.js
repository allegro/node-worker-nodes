const test = require('ava');
const fs = require('fs');

const WorkerNodes = require('../');
const { fixture, eventually } = require('./utils');

for (const workerType of ["process"]) {
    test(`should generate heap snapshot result file workerType: ${workerType}`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-function-async'), { lazyStart: true, workerType });
        await workerNodes.ready();
        await workerNodes.call('hello!');

        // when
        workerNodes.takeSnapshot();
        const getHeapSnapshotFilename = workerType === "thread" ?
            () => fs.readdirSync(process.cwd()).find(name => name.includes('.heapsnapshot') && name.includes(`-${process.pid}-`)) :
            () => fs.readdirSync(process.cwd()).find(name => name.includes('.heapsnapshot') && !name.includes(`-${process.pid}-`));
        await eventually(() => getHeapSnapshotFilename());

        const result = getHeapSnapshotFilename();
        t.truthy(result);
        t.true(result.length > 0)
        fs.unlinkSync(result);
    });

    test(`should generate heap profiler result file workerType: ${workerType}`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-function-async'), { lazyStart: true, workerType });
        await workerNodes.ready();

        // when
        workerNodes.profiler(200);

        await workerNodes.call('hello!');

        const getCpuProfileFilename = workerType === "thread" ? 
            () => fs.readdirSync(process.cwd()).find(name => name.includes('.cpuprofile') && name.includes(`-${process.pid}-`)) : 
            () => fs.readdirSync(process.cwd()).find(name => name.includes('.cpuprofile') && !name.includes(`-${process.pid}-`));

        await eventually(() => getCpuProfileFilename());

        const result = getCpuProfileFilename();

        t.truthy(result);
        t.true(result.length > 0)
        fs.unlinkSync(result);
    });
}