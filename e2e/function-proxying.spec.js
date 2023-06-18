const test = require('ava');

const WorkerNodes = require('../');
const { fixture } = require('./utils');

for (const workerType of ["thread", "process"]) {
    test(`should be exposed as a function named call workerType: ${workerType}`, t => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-function-sync'), { workerType });

        // expect
        t.true(Object.prototype.hasOwnProperty.call(workerNodes, 'call'));
        t.is(typeof workerNodes.call, 'function');
    });

    test(`should support single, synchronous function workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-function-sync'), { workerType });

        // when
        const result = await workerNodes.call('hello!');

        // then
        t.is(result, 'hello!');
    });

    test(`should support single, asynchronous function workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-function-async'), { workerType });

        // when
        const result = await workerNodes.call('hello!');

        // then
        t.is(result, 'hello!');
    });

    test(`should support module that exports multiple functions workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-module-callable'), { workerType });

        // when
        const resultFoo = await workerNodes.call('hello foo!');
        const resultBar = await workerNodes.call.echoSync('hello bar!');
        const resultBaz = await workerNodes.call.echoAsync('hello baz!');

        // then
        t.is(resultFoo, 'hello foo!');
        t.is(resultBar, 'hello bar!');
        t.is(resultBaz, 'hello baz!');
    });

    test(`should retain this context of the module methods workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-module-plain'), { workerType });

        // when
        const result = await workerNodes.call.echoMethod('this retained!');

        // then
        t.is(result, 'this retained!');
    });

    test(`should fail when trying to call directly a module that is not a function workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-module-plain'), { workerType });

        // when
        const error = await t.throwsAsync(workerNodes.call(), { instanceOf: TypeError });

        // then
        t.is(error.message, '__module__ is not a function');
    });

    test(`should fail when trying to call a property that is not a function workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-module-plain'), { workerType });

        // when
        const error = await t.throwsAsync(workerNodes.call.echo, { instanceOf: TypeError });

        // then
        t.is(error.message, 'echo is not a function');
    });

    test(`should fail when dealing with non-existing function workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-function-sync'), { workerType });

        // when
        const error = await t.throwsAsync(workerNodes.call.nonExistingFunction, { instanceOf: TypeError });

        // then
        t.is(error.message, 'nonExistingFunction is not a function');
    });
}