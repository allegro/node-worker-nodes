const test = require('ava');

const WorkerNodes = require('../');
const { fixture } = require('./utils');

for (const workerType of ["thread", "process"]) {
    test(`should be propagated to a caller workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('messy-module'), { workerType });

        // then
        await t.throwsAsync(workerNodes.call.typeError, { instanceOf: Error });
    });

    test(`should contain proper call stack workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('messy-module'));

        // when
        const error = await t.throwsAsync(workerNodes.call.typeError);

        // then
        t.regex(error.stack, new RegExp('e2e[/\\\\]+fixtures[/\\\\]+messy-module.js', 'g'));
    });

    test(`should be propagated with error type info retained workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('messy-module'), { workerType });

        // then
        await t.throwsAsync(workerNodes.call.typeError, { instanceOf: TypeError });
        await t.throwsAsync(workerNodes.call.referenceError, { instanceOf: ReferenceError });
    });

    test(`should be propagated with all the custom error fields that they have workerType: ${workerType}`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('messy-module'), { workerType });

        // when
        const resultFoo = await t.throwsAsync(() => workerNodes.call.customError({ foo: 1, bar: 2 }), { instanceOf: Error });

        // then
        /* eslint-disable-next-line */
        t.like(resultFoo, { foo: 1, bar: 2 });
    });

    test(`should be wrapped in an Error object if they were promise rejections workerType: ${workerType}`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('messy-module'), { workerType });

        // when
        const resultFoo = await t.throwsAsync(() => workerNodes.call.promiseRejection({ reason: 'rejection reason' }), { instanceOf: Error });

        // then
        /* eslint-disable-next-line */
        t.like(resultFoo, { reason: 'rejection reason' });
    });

    test(`should not result in the spawn of a new worker workerType: ${workerType}`, async (t) => {
        // given
        const workerNodes = new WorkerNodes(fixture('messy-module'), { maxWorkers: 1, workerType });

        // when
        const pidBefore = await workerNodes.call.getPid();
        await workerNodes.call.typeError().catch(error => error);
        const pidAfter = await workerNodes.call.getPid();

        // then
        t.is(pidBefore, pidAfter);
        t.is(typeof pidBefore, 'number');
    });
}