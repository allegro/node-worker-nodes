const test = require('ava');

const WorkerNodes = require('../');
const { fixture } = require('./utils');

test('should allow to receive a Uint8Array from the worker', async (t) => {
    // given
    const workerNodes = new WorkerNodes(fixture('buffer-ready-module'));

    // when
    const result = await workerNodes.call.getDeflated('hello my friend!!!');
    const decoded = require('zlib').inflateSync(result).toString();

    // then
    t.true(result instanceof Uint8Array);
    t.is(decoded, 'hello my friend!!!');
});

test('should allow to receive a Uint8Array as an object property', async (t) => {
    // given
    const workerNodes = new WorkerNodes(fixture('buffer-ready-module'));

    // when
    const result = await workerNodes.call.getDeflatedInProperty('hello my friend!!!');

    // then
    t.is(result.info, 'deflate');
    t.true(result.data instanceof Uint8Array);
    t.is(require('zlib').inflateSync(result.data).toString(), 'hello my friend!!!')
});

test('should allow to send a Uint8Array to the worker', async (t) => {
    // given
    const workerNodes = new WorkerNodes(fixture('buffer-ready-module'));

    // when
    const result = await workerNodes.call.isUint8Array(Buffer.from('foobar'));

    // then
    t.true(result);
});

test('should be available in both directions', async (t) => {
    // given
    const workerNodes = new WorkerNodes(fixture('buffer-ready-module'));

    // when
    const result = await workerNodes.call.sliceInHalf(Buffer.from('foobar'));

    // then
    t.is(Buffer.compare(Buffer.from('foo'), result), 0);
});