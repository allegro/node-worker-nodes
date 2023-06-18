const test = require('ava');

const WorkerNodes = require('../');
const errors = require('../lib/errors');
const { fixture, wait, eventually } = require('./utils');

for (const workerType of ["thread", "process"]) {
    test(`should not affect fast method calls workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('async-tasks'), { taskTimeout: 500, maxWorkers: 1, workerType });
        await workerNodes.ready();

        // then
        await t.notThrowsAsync(workerNodes.call.task100ms);
    });

    test(`should result in an error when a single method call takes too long workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('async-tasks'), { taskTimeout: 250, maxWorkers: 1, workerType });
        await workerNodes.ready();

        // then
        await t.throwsAsync(workerNodes.call.task500ms, { instanceOf: errors.TimeoutError });
    });

    test(`should kill the worker that was involved in processing the task workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('async-tasks'), { taskTimeout: 250, maxWorkers: 1, workerType });
        await workerNodes.ready();

        // when
        let executingWorkerId;
        await t.throwsAsync(async () => {
            const p = workerNodes.call.task500ms();
            workerNodes.workersQueue.storage.forEach(worker => executingWorkerId = worker.id);
            await p;
        }, { instanceOf: errors.TimeoutError });
        await eventually(() => workerNodes.workersQueue.storage.filter(worker => worker.id === executingWorkerId).length === 0);

        // then
        t.is(workerNodes.workersQueue.storage.filter(worker => worker.id === executingWorkerId).length, 0);
    });

    test(`should result with rejection of all the calls that the worker was processing at the moment workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('async-tasks'), {
            autoStart: true,
            minWorkers: 1,
            maxWorkers: 1,
            maxTasksPerWorker: 2,
            taskTimeout: 250,
            workerType
        });
        await workerNodes.ready();

        // when

        const failingCall = workerNodes.call.task500ms().catch(error => error);
        await wait(200);

        const secondCall = workerNodes.call.task100ms().catch(error => error);
        const results = await Promise.all([failingCall, secondCall]);

        // then
        results.forEach(result => {
            t.true(result instanceof errors.TimeoutError);
        });
    });

    test(`should result in the spawn of a new worker workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('async-tasks'), {
            maxWorkers: 1,
            maxTasksPerWorker: Infinity,
            taskTimeout: 250,
            workerType
        });
        await workerNodes.ready();

        // when
        await workerNodes.call.noop();
        const idBefore = workerNodes.workersQueue.storage[0].id;
        const callResult = await workerNodes.call.task500ms().catch(error => error);
        await workerNodes.call.noop();
        const idAfter = workerNodes.workersQueue.storage[0].id;

        // then
        t.true(callResult instanceof errors.TimeoutError);
        t.not(idBefore, idAfter);
        t.is(typeof idBefore, 'number');
    });
}