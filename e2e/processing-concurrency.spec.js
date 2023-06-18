const test = require('ava');

const WorkerNodes = require('../');
const { fixture, repeatCall } = require('./utils');

for (const workerType of ["thread", "process"]) {
    test(`should be limited to one by default workerType: ${workerType}`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('async-tasks'), { maxWorkers: 1, workerType });
        await workerNodes.ready();
        const startTime = Date.now();

        // when
        await repeatCall(workerNodes.call.task100ms, 10);

        // then
        const totalDuration = (Date.now() - startTime);
        t.true(totalDuration >= 1000);
    });

    test(`should allow to limit the amount of concurrent calls sent to a single worker workerType: ${workerType}`, async (t) => {
        const workerNodes = new WorkerNodes(fixture('async-tasks'), { maxWorkers: 1, maxTasksPerWorker: 5 });
        await workerNodes.ready();
        const startTime = Date.now();

        // when
        await repeatCall(workerNodes.call.task100ms, 10);

        // then
        const totalDuration = (Date.now() - startTime);
        t.true(200 < totalDuration < 1000);
    });
}