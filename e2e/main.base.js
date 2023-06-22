const test = require('ava');

const WorkerNodes = require('../');
const errors = require('../lib/errors');
const { fixture, unique, repeatCall } = require('./utils');
const { Worker } = require('worker_threads');
const { ChildProcess } = require('child_process');

module.exports = function describe(workerType) {
    test(`should be exposed as a constructor function`, t => {
        t.throws(() => WorkerNodes(), { instanceOf: TypeError }, "cannot be invoked without 'new'")
    });

    test(`should report its readiness`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('process-info'), { workerType });

        // when
        const ready = await workerNodes.ready();

        // then
        t.truthy(ready);
    });

    test(`should allow to load a module that has dependencies`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-module-with-imports'), { workerType });

        // when
        const result = await workerNodes.call.echoSync('hello!');

        // then
        t.is(result, 'hello!');
    });

    test(`should ${workerType === "process" ? "NOT " : ""}use the same process as the caller does based on`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('process-info'), { workerType });
    
        // when
        const result = await workerNodes.call.getPid();
    
        // then
        if (workerType === "thread") {
            t.is(result, process.pid);
        } else {
            t.not(result, process.pid);
        }
    });
    
    test(`should allow limit the number of workers active in a given time ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('process-info'), { maxWorkers: 1, workerType });

        // when
        const results = await repeatCall(workerNodes.call.getPid, 10);

        // then
        t.is(unique(results).length, 1);
    });

    test(`should not use a single worker more times than a given limit ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('process-info'), { maxWorkers: 1, workerEndurance: 2, workerType });

        // when
        await repeatCall(workerNodes.call.noop, 10);

        // then
        workerNodes.workersQueue.forEach(worker => t.true(worker.tasksStarted <= 2));
    });

    test(`should distribute the work evenly among available workers ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('process-info'), {
            autoStart: true,
            maxWorkers: 10,
            minWorkers: 10,
            workerType
        });
        await workerNodes.ready();

        // when
        await repeatCall(workerNodes.call.getPid, 10);

        // then
        workerNodes.workersQueue.forEach(worker => t.is(worker.tasksStarted, 1));
    });

    test(`should reject calls that exceeds given limit`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('async-tasks'), {
            autoStart: true,
            minWorkers: 2,
            maxWorkers: 2,
            maxTasksPerWorker: 5,
            maxTasks: 5,
            workerType
        });
        await workerNodes.ready();

        // then
        await t.throwsAsync(() => repeatCall(workerNodes.call.task100ms, 10), { instanceOf: errors.MaxConcurrentCallsError });
    });

    test(`should kill worker that got stuck in an infinite loop`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('harmful-module'), { taskTimeout: 500, maxWorkers: 1, workerType });

        // then
        await workerNodes.call.noop();
        const idBefore = workerNodes.workersQueue.storage[0].id;
        await t.throwsAsync(workerNodes.call.infiniteLoop, { instanceOf: errors.TimeoutError });
        await workerNodes.call.noop();
        const idAfter = workerNodes.workersQueue.storage[0].id;

        await t.not(idBefore, idAfter);
    });

    test(`should return used workers list`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('process-info'), {
            autoStart: true,
            maxWorkers: 10,
            minWorkers: 10,
            workerType
        });
        await workerNodes.ready();

        const workersList = workerNodes.getUsedWorkers();

        const WorkerImplClass = workerType === "process" ? ChildProcess : Worker;

        // then
        workersList.forEach(worker => t.true(worker instanceof WorkerImplClass));
    });
}

