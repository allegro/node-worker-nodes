const test = require('ava');

const WorkerNodes = require('../');
const { fixture } = require('./utils');

module.exports = function describe(workerType) {
    test(`should be exposed as a function named call`, t => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-function-sync'), { workerType });

        // expect
        t.true(Object.prototype.hasOwnProperty.call(workerNodes, 'call'));
        t.is(typeof workerNodes.call, 'function');
    });

    test(`should support single, synchronous function`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-function-sync'), { workerType });

        // when
        const result = await workerNodes.call('hello!');

        // then
        t.is(result, 'hello!');
    });

    test(`should support single, asynchronous function`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-function-async'), { workerType });

        // when
        const result = await workerNodes.call('hello!');

        // then
        t.is(result, 'hello!');
    });

    test(`should support module that exports multiple functions`, async t => {
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

    test(`should retain this context of the module methods`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-module-plain'), { workerType });

        // when
        const result = await workerNodes.call.echoMethod('this retained!');

        // then
        t.is(result, 'this retained!');
    });

    test(`should fail when trying to call directly a module that is not a function`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-module-plain'), { workerType });

        // when
        const error = await t.throwsAsync(workerNodes.call(), { instanceOf: TypeError });

        // then
        t.is(error.message, '__module__ is not a function');
    });

    test(`should fail when trying to call a property that is not a function`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-module-plain'), { workerType });

        // when
        const error = await t.throwsAsync(workerNodes.call.echo, { instanceOf: TypeError });

        // then
        t.is(error.message, 'echo is not a function');
    });

    test(`should fail when dealing with non-existing function`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('echo-function-sync'), { workerType });

        // when
        const error = await t.throwsAsync(workerNodes.call.nonExistingFunction, { instanceOf: TypeError });

        // then
        t.is(error.message, 'nonExistingFunction is not a function');
    });
}