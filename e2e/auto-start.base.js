const test = require('ava');

const WorkerNodes = require('../');
const { fixture, unique, repeatCall, eventually } = require('./utils');

module.exports = function describe(workerType) {
    test(`should be disabled by default`, async t => {
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

    test(`should result in spawn of the workers before the first call if active`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('process-info'), { autoStart: true, minWorkers: 1, maxWorkers: 1, workerType });
        await workerNodes.ready();

        // when
        const callTime = Date.now();
        const workerStartTime = await workerNodes.call.getStartTime();

        // then
        t.true(workerStartTime <= callTime);
    });

    test(`should force the workerNodes to wait for all the required workers to start before reporting ready`, async t => {
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

    test(`should only use workers that are fully initialized`, async t => {
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

        // then
        // we wait for all workers to come back a live
        const getLiveWorkers = () => workerNodes.workersQueue.filter(worker => worker.isProcessAlive);
        await eventually(() => unique(getLiveWorkers()).length === 2);
        t.is(unique(getLiveWorkers()).length, 2);
    });
}