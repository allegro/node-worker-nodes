const test = require('ava');

const WorkerNodes = require('../');
const { fixture, unique, repeatCall, wait } = require('./utils');

for (const workerType of ["thread", "process"]) {
    test(`should be disabled by default workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('process-info'), { workerType });

        // when
        const callTime = new Date();
        await workerNodes.call.noop();

        // then
        workerNodes.workersQueue.forEach(worker => {
            const startDate = worker.process.startDate;

            if (startDate) {
                t.true(startDate >= callTime);
            }
        });
    });

    test(`should result in spawn of the workers before the first call if active workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('process-info'), { autoStart: true, minWorkers: 1, maxWorkers: 1, workerType });
        await workerNodes.ready();

        // when
        const callTime = Date.now();
        const workerStartTime = await workerNodes.call.getStartTime();

        // then
        t.true(workerStartTime <= callTime);
    });

    test(`should force the workerNodes to wait for all the required workers to start before reporting ready workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('process-info'), { autoStart: true, minWorkers: 4, maxWorkers: 4, workerType });
        await workerNodes.ready();
        const callStartTime = Date.now();

        // when
        const results = await repeatCall(workerNodes.call.getStartTime, 4);

        // then
        t.is(results.length, 4);

        results.forEach(result => t.true(result <= callStartTime));
    });

    test(`should only use workers that are fully initialized workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('slow-module'), {
            autoStart: true,
            minWorkers: 2,
            maxWorkers: 2,
            taskMaxRetries: Infinity,
            workerType
        });
        await workerNodes.ready();

        await repeatCall(workerNodes.call.getPid, 4);

        // when
        workerNodes.workersQueue.storage[0].process.exit();
        await repeatCall(workerNodes.call.getPid, 4);

        const results = workerNodes.workersQueue.filter(worker => worker.isProcessAlive);

        // then
        t.is(unique(results).length, 1);
    });
}