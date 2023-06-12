const test = require('ava');

const WorkerNodes = require('..');
const { fixture, repeatCall, wait } = require('./utils');


test('should spawn new workers when old workers exit even if no items in the queue', async (t) => {
    // given
    const maxWorkers = 4;
    const minWorkers = 2;
    const workerNodes = new WorkerNodes(fixture('process-info'), { maxWorkers, minWorkers, workerEndurance: 1, autoStart: true });

    await workerNodes.ready();

    const operationWorkersCountBefore = workerNodes.workersQueue.filter((worker) => worker.isOperational()).length;
    t.is(operationWorkersCountBefore, minWorkers);

    // when
    await repeatCall(workerNodes.call.noop, maxWorkers);
    t.is(workerNodes.workersQueue.filter((worker) => worker.isOperational()).length, 0);

    await wait(200);

    // then
    const operationWorkersCountAfter = workerNodes.workersQueue.filter((worker) => worker.isOperational()).length;
    t.is(operationWorkersCountAfter, maxWorkers);
});
