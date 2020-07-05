const test = require('ava');

const WorkerNodes = require('../');
const errors = require('../lib/errors');
const { fixture, unique, repeatCall } = require('./utils');

test('should be exposed as a constructor function', t => {
    t.throws(() => WorkerNodes(), { instanceOf: TypeError }, "cannot be invoked without 'new'")
});

test('should report its readiness', async t => {
    // given
    const workerNodes = new WorkerNodes(fixture('process-info'));

    // when
    const ready = await workerNodes.ready();

    // then
    t.truthy(ready);
});

test('should allow to load a module that has dependencies', async t => {
    // given
    const workerNodes = new WorkerNodes(fixture('echo-module-with-imports'));

    // when
    const result = await workerNodes.call.echoSync('hello!');

    // then
    t.is(result, 'hello!');
});

test('should use the same process as the caller does', async t => {
    // given
    const workerNodes = new WorkerNodes(fixture('process-info'));

    // when
    const result = await workerNodes.call.getPid();

    // then
    t.is(result, process.pid);
});

test('should allow limit the number of workers active in a given time', async t => {
    // given
    const workerNodes = new WorkerNodes(fixture('process-info'), { maxWorkers: 1 });

    // when
    const results = await repeatCall(workerNodes.call.getPid, 10);

    // then
    t.is(unique(results).length, 1);
});

test('should not use a single worker more times than a given limit', async t => {
    // given
    const workerNodes = new WorkerNodes(fixture('process-info'), { maxWorkers: 1, workerEndurance: 2 });

    // when
    await repeatCall(workerNodes.call.noop, 10);

    // then
    workerNodes.workersQueue.forEach(worker => t.true(worker.tasksStarted <= 2));
});

test('should distribute the work evenly among available workers', async t => {
    // given
    const workerNodes = new WorkerNodes(fixture('process-info'), {
        autoStart: true,
        maxWorkers: 10,
        minWorkers: 10
    });
    await workerNodes.ready();

    // when
    await repeatCall(workerNodes.call.getPid, 10);

    // then
    workerNodes.workersQueue.forEach(worker => t.is(worker.tasksStarted, 1));
});

test('should reject calls that exceeds given limit', async t => {
    // given
    const workerNodes = new WorkerNodes(fixture('async-tasks'), {
        autoStart: true,
        minWorkers: 2,
        maxWorkers: 2,
        maxTasksPerWorker: 5,
        maxTasks: 5
    });
    await workerNodes.ready();

    // then
    await t.throwsAsync(() => repeatCall(workerNodes.call.task100ms, 10), { instanceOf: errors.MaxConcurrentCallsError });
});

test('should kill worker that got stuck in an infinite loop', async t => {
    // given
    const workerNodes = new WorkerNodes(fixture('harmful-module'), { taskTimeout: 500, maxWorkers: 1 });

    // then
    await t.throwsAsync(workerNodes.call.infiniteLoop, { instanceOf: errors.TimeoutError });
});
