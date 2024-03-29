const test = require('ava');

const WorkerNodes = require('..');
const { fixture, repeatCall, eventually } = require('./utils');

module.exports = function describe(workerType) {
    test(`should spawn new workers when old workers exit even if no items in the queue`, async (t) => {
        // given
        const maxWorkers = 4;
        const minWorkers = 2;
        
        const workerNodes = new WorkerNodes(fixture('process-info'), { maxWorkers, minWorkers, workerEndurance: 1, autoStart: true, workerType });
        const getOperationalWorkersCount = () => workerNodes.workersQueue.filter((worker) => worker.isOperational()).length;
        await workerNodes.ready();

        t.true(getOperationalWorkersCount() >= minWorkers); // because autoStart: true, maxWorkers would get started, but pool considered ready after minWorkers.
        await eventually(() => getOperationalWorkersCount() === maxWorkers); // lets wait for all of the workers to start, so we'll capture all workers ids
        const workerIdsBeforeTaskExecution = new Set(workerNodes.workersQueue.map(worker => worker.id));

        // when
        await repeatCall(workerNodes.call.noop, maxWorkers);

        // we expect the workers we used to be released
        const getOperationWorkersWithIdsCount = (ids) => workerNodes.workersQueue.filter((worker) => ids.has(worker.id)).length;
        await eventually(() => getOperationWorkersWithIdsCount(workerIdsBeforeTaskExecution) === 0)
        t.is(getOperationWorkersWithIdsCount(workerIdsBeforeTaskExecution), 0);


        // then
        // we're waiting to all workers to be operational, the time for that might variate greatly between machines (Developer machine vs CI machine)
        await eventually(() => getOperationalWorkersCount() === maxWorkers);
        t.is(getOperationalWorkersCount(), maxWorkers);
    });


    test(`should shutdown fine`, async (t) => {
        // given
        const maxWorkers = 4;
        const minWorkers = 2;
        const workerNodes = new WorkerNodes(fixture('process-info'), { maxWorkers, minWorkers, workerEndurance: 1, autoStart: true, workerType });

        await workerNodes.ready();
        await t.notThrowsAsync(() => workerNodes.terminate());

        const getAliveWorkersCount = () => workerNodes.workersQueue.filter((worker) => worker.isProcessAlive).length;

        await eventually(() => getAliveWorkersCount() === 0);
        t.is(getAliveWorkersCount(), 0);
    });
}