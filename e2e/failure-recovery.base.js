const test = require('ava');

const WorkerNodes = require('../');
const errors = require('../lib/errors');
const { fixture, repeatCall, wait } = require('./utils');

module.exports = function describe(workerType) {
    test(`should be disabled by default`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('harmful-module'), { maxWorkers: 1, workerType });

        // then
        await t.throwsAsync(workerNodes.call.exitAlways, { instanceOf: errors.ProcessTerminatedError });
    });

    test(`should give up after max retries limit has been reached`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('harmful-module'), { maxWorkers: 1, taskMaxRetries: 3, workerType });

        // when
        const result = await t.throwsAsync(workerNodes.call.exitAlways, { instanceOf: errors.ProcessTerminatedError });

        // then
        t.is(result.message, 'cancel after 3 retries!')
    });

    test(`should catch thrown exceptions`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('harmful-module'), { maxWorkers: 1, taskMaxRetries: 0, workerType });

        // when
        const result = await t.throwsAsync(workerNodes.call.throwsAlways, { instanceOf: Error });

        // then
        t.is(result.message, 'thrown');
    });

    test(`should catch rejected promises`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('harmful-module'), { maxWorkers: 1, taskMaxRetries: 0, workerType });

        // when
        const result = await t.throwsAsync(workerNodes.call.rejectAlways, { instanceOf: Error });

        // then
        t.is(result.message, 'rejected');
    });

    test(`should be successful if previously failing task would reconsider its behaviour`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('harmful-module'), { maxWorkers: 1, taskMaxRetries: 3, workerType });

        // when
        await workerNodes.call.setSomeJobFailsNumber(2);
        const result = await workerNodes.call.someJob();

        // then
        t.true(result);
    });

    test(`should put through number of retries`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('harmful-module'), { maxWorkers: 1, taskMaxRetries: Infinity, workerType });
        await wait(5000);

        // when
        const results = await repeatCall(workerNodes.call.exitRandomly, 10);

        // then
        t.is(results.length, 10);
    });
}