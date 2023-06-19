const test = require('ava');

const WorkerNodes = require('../');
const { fixture, unique, repeatCall } = require('./utils');

module.exports = function describe(workerType) {
    test(`should be disabled by default`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('process-info'), { autoStart: true, minWorkers: 2, maxWorkers: 4, workerType });
        await workerNodes.ready();
        const callStartTime = Date.now();

        // when
        const results = await repeatCall(workerNodes.call.getStartTime, 4);

        // then
        t.is(results.length, 4);
        results.forEach(result => t.true(result <= callStartTime));
    });

    test(`should cause only the minimum required number of workers to start at init`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('async-tasks'), {
            autoStart: true,
            lazyStart: true,
            minWorkers: 2,
            maxWorkers: 4,
            workerType,
        });
        await workerNodes.ready();
        const callStartTime = new Date();

        // when
        await repeatCall(workerNodes.call.task100ms, 4);
        const results = workerNodes.workersQueue.map(worker => worker.process.startDate).sort((a, b) => a.getTime() - b.getTime());

        console.log(`results ${workerType} callStartTime: ${callStartTime}`, results);

        // then
        t.is(results.length, 4);
        results.slice(0, 2).forEach(result => t.true(result <= callStartTime));
        results.slice(2, 4).forEach(result => t.true(result >= callStartTime));
    });

    test(`should not affect work assignment to the workers by default`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('process-info'), {
            autoStart: true,
            minWorkers: 3,
            maxWorkers: 3,
            workerType
        });
        await workerNodes.ready();

        // when
        await workerNodes.call.getPid();
        await workerNodes.call.getPid();
        await workerNodes.call.getPid();
        const result = workerNodes.workersQueue.map(worker => worker.tasksStarted);

        // then
        t.deepEqual(result, [1, 1, 1]);
    });

    test(`should cause maximum utilization of the existing workers if calls are sequential`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('process-info'), {
            lazyStart: true,
            minWorkers: 1,
            maxWorkers: 3,
            workerType
        });

        // when
        const results1 = await workerNodes.call.getPid();
        const results2 = await workerNodes.call.getPid();
        const results3 = await workerNodes.call.getPid();

        // then
        t.is(unique([results1, results2, results3]).length, 1);
    });

    test(`should spawn max number of workers to handle the concurrent calls`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('process-info'), {
            lazyStart: true,
            minWorkers: 1,
            maxWorkers: 3,
            workerType
        });

        // when
        await repeatCall(workerNodes.call.noop, 4);

        // then
        t.is(workerNodes.workersQueue.storage.length, 3);
    });
}