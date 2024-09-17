const test = require('ava');
const fs = require('fs');

const WorkerNodes = require('../');
const { fixture, eventually } = require('./utils');

module.exports = function describe(workerType) {
    test(`should generate heap snapshot result file`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-function-async'), { lazyStart: true, workerType });
        await workerNodes.ready();
        await workerNodes.call('hello!');

        // when
        const filePath = await workerNodes.takeSnapshot();

        t.regex(filePath, /^HeapSnapshot-\d+-\d+\.heapsnapshot$/);
        t.true(fs.existsSync(filePath))
        fs.unlinkSync(filePath);
    });

    test.serial(`should restart worker after taking heap snapshot when restartWorker option was set`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-function-async'), { lazyStart: true, workerType });
        await workerNodes.ready();
        await workerNodes.call('hello!');

        const workersBefore = workerNodes.getUsedWorkers();

        // when
        const filePath = await workerNodes.takeSnapshot({ restartWorker: true });
        fs.unlinkSync(filePath);

        // Waiting for a worker to restart
        await new Promise((resolve) => setTimeout(resolve, 500));

        const workersAfter = workerNodes.getUsedWorkers();
        t.true(workersBefore.length === workersAfter.length);
        t.true(workersBefore[0] !== workersAfter[0]);
    });

    test.serial(`should let takeSnapshot throw an error when there is not enough heap`, async (t) => {
        const workerNodes = new WorkerNodes(fixture('mock-heap-statistics'), { lazyStart: true, workerType });
        await workerNodes.ready();
        await workerNodes.call();

        await t.throwsAsync(workerNodes.takeSnapshot(), {
            message: 'Not enough memory to perform heap snapshot'
        })
    });

    test(`should generate heap profiler result file`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-function-async'), { lazyStart: true, workerType });
        await workerNodes.ready();

        // when
        workerNodes.profiler(200);

        await workerNodes.call('hello!');

        const getCpuProfileFilename = workerType === "thread" ?
            () => fs.readdirSync(process.cwd()).find(name => name.includes('.cpuprofile') && name.includes(`-${process.pid}-`)) :
            () => fs.readdirSync(process.cwd()).find(name => name.includes('.cpuprofile') && !name.includes(`-${process.pid}-`));

        await eventually(() => getCpuProfileFilename() !== undefined);

        const result = getCpuProfileFilename();

        t.truthy(result);
        t.true(result.length > 0)
        fs.unlinkSync(result);
    });
}
