const WorkerNodes = require('../');
const errors = require('../lib/errors');

const { fixture, wait, unique, isRunning } = require('./utils');

describe('worker nodes', function () {

    let workerNodes;

    afterEach(function* () {
        if (workerNodes) yield workerNodes.terminate();
    });

    it('should be exposed as a constructor function', function () {
        // given
        const callWithoutNew = () => WorkerNodes();

        // expect
        callWithoutNew.should.throw(TypeError, "cannot be invoked without 'new'");
    });

    it('should report its readiness', function* () {
        // given
        workerNodes = new WorkerNodes(fixture('process-info'));

        // when
        const ready = yield workerNodes.ready();

        // then
        ready.should.be.truthy;
    });

    describe('function proxying', function () {

        it('should be exposed as a function named call', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('echo-function-sync'));

            // expect
            workerNodes.should.have.property('call').that.is.a('function');
        });

        it('should support single, synchronous function', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('echo-function-sync'));

            // when
            const result = yield workerNodes.call('hello!');

            // then
            result.should.be.eql('hello!');
        });

        it('should support single, asynchronous function', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('echo-function-async'));

            // when
            const result = yield workerNodes.call('hello!');

            // then
            result.should.be.eql('hello!');
        });

        it('should support module that exports multiple functions', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('echo-module-callable'));

            // when
            const resultFoo = yield workerNodes.call('hello foo!');
            const resultBar = yield workerNodes.call.echoSync('hello bar!');
            const resultBaz = yield workerNodes.call.echoAsync('hello baz!');

            // then
            resultFoo.should.be.eql('hello foo!');
            resultBar.should.be.eql('hello bar!');
            resultBaz.should.be.eql('hello baz!');
        });

        it('should retain this context of the module methods', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('echo-module-plain'));

            // when
            const result = yield workerNodes.call.echoMethod('this retained!');

            // then
            result.should.be.eql('this retained!');
        });

        it('should fail when trying to call directly a module that is not a function', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('echo-module-plain'));

            // when
            const result = yield workerNodes.call().catch(error => error);

            // then
            result.should.be.an.instanceOf(TypeError).that.have.property('message', '__module__ is not a function');
        });

        it('should fail when trying to call a property that is not a function', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('echo-module-plain'));

            // when
            const result = yield workerNodes.call.echo().catch(error => error);

            // then
            result.should.be.an.instanceOf(TypeError).that.have.property('message', 'echo is not a function');
        });

        it('should fail when dealing with non-existing function', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('echo-function-sync'));

            // when
            const result = yield workerNodes.call.nonExistingFunction().catch(error => error);

            // then
            result.should.be.an.instanceOf(TypeError).that.have.property('message', 'nonExistingFunction is not a function');
        });

    });

    it('should allow to load a module that has dependencies', function* () {
        // given
        workerNodes = new WorkerNodes(fixture('echo-module-with-imports'));

        // when
        const result = yield workerNodes.call.echoSync('hello!');

        // then
        result.should.be.eql('hello!');
    });

    it('should *not* use the same process as the caller does', function* () {
        // given
        workerNodes = new WorkerNodes(fixture('process-info'));

        // when
        const result = yield workerNodes.call.getPid();

        // then
        result.should.be.a('number').that.not.eql(process.pid);
    });

    it('should allow limit the number of workers active in a given time', function* () {
        // given
        workerNodes = new WorkerNodes(fixture('process-info'), { maxWorkers: 1 });

        // when
        const results = yield (10).times.call(workerNodes.call.getPid).and.waitForAllResults();

        // then
        unique(results).should.have.lengthOf(1);
    });

    it('should not use a single worker more times than a given limit', function* () {
        // given
        workerNodes = new WorkerNodes(fixture('process-info'), { maxWorkers: 1, workerEndurance: 2 });

        // when
        const results = yield (10).times.call(workerNodes.call.getPid).and.waitForAllResults();

        // then
        unique(results).should.have.lengthOf(5);
    });

    it('should distribute the work evenly among available workers', function* () {
        // given
        workerNodes = new WorkerNodes(fixture('process-info'), { maxWorkers: 10 });

        // when
        const results = yield (10).times.call(workerNodes.call.getPid).and.waitForAllResults();

        // then
        unique(results).should.have.lengthOf(10);
    });

    describe('auto-start', function () {

        it('should be disabled by default', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('process-info'));

            // when
            const callTime = Date.now();
            const workerStartTime = yield workerNodes.call.getStartTime();

            // then
            workerStartTime.should.be.at.least(callTime);
        });

        it('should result in spawn of the workers before the first call if active', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('process-info'), { autoStart: true, maxWorkers: 1 });

            // when
            yield wait(500);
            const callTime = Date.now();
            const workerStartTime = yield workerNodes.call.getStartTime();

            // then
            workerStartTime.should.be.at.most(callTime);
        });

        it('should force the workerNodes to wait for all the required workers to start before reporting ready', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('process-info'), { autoStart: true, minWorkers: 4, maxWorkers: 4 });
            yield workerNodes.ready();
            const callStartTime = Date.now();

            // when
            const results = yield (4).times.call(workerNodes.call.getStartTime).and.waitForAllResults();

            // then
            results.should.have.lengthOf(4);
            results.forEach(result => result.should.be.at.most(callStartTime));
        });

    });

    describe('lazy start', function () {

        it('should be disabled by default', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('process-info'), { autoStart: true, minWorkers: 2, maxWorkers: 4 });
            yield workerNodes.ready();
            const callStartTime = Date.now();

            // when
            const results = yield (4).times.call(workerNodes.call.getStartTime).and.waitForAllResults();

            // then
            results.should.have.lengthOf(4);
            results.forEach(result => result.should.be.at.most(callStartTime));
        });

        it('should cause only the minimum required number of workers to start at init', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('process-info'), {
                autoStart: true,
                lazyStart: true,
                minWorkers: 2,
                maxWorkers: 4
            });
            yield workerNodes.ready();
            const callStartTime = Date.now();

            // when
            const results = yield (4).times.call(workerNodes.call.getStartTime).and.waitForAllResults();

            // then
            results.should.have.lengthOf(4);
            results.slice(0, 2).forEach(result => result.should.be.at.most(callStartTime));
            results.slice(2, 4).forEach(result => result.should.be.at.least(callStartTime));
        });

        it('should not affect work assignment to the workers by default', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('process-info'), {
                minWorkers: 1,
                maxWorkers: 3
            });

            // when
            const results1 = yield workerNodes.call.getPid();
            const results2 = yield workerNodes.call.getPid();
            const results3 = yield workerNodes.call.getPid();

            // then
            unique([ results1, results2, results3 ]).should.have.lengthOf(3);
        });

        it('should cause maximum utilization of the existing workers if calls are sequential', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('process-info'), {
                lazyStart: true,
                minWorkers: 1,
                maxWorkers: 3
            });

            // when
            const results1 = yield workerNodes.call.getPid();
            const results2 = yield workerNodes.call.getPid();
            const results3 = yield workerNodes.call.getPid();

            // then
            unique([ results1, results2, results3 ]).should.have.lengthOf(1);
        });

        it('should spawn max number of workers to handle the concurrent calls', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('process-info'), {
                lazyStart: true,
                minWorkers: 1,
                maxWorkers: 3
            });

            // when
            const results = yield (4).times.call(workerNodes.call.getStartTime).and.waitForAllResults();

            // then
            unique(results).should.have.lengthOf(3);
        });

    });

    describe('worker processing concurrency', function () {

        it('should be limited to one by default', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('async-tasks'), { maxWorkers: 1 });
            const startTime = yield workerNodes.ready().then(() => Date.now());

            // when
            yield (10).times.call(workerNodes.call.task100ms).and.waitForAllResults();

            // then
            const totalDuration = (Date.now() - startTime);
            totalDuration.should.be.at.least(1000);
        });

        it('should allow to limit the amount of concurrent calls sent to a single worker', function* () {
            workerNodes = new WorkerNodes(fixture('async-tasks'), { maxWorkers: 1, maxTasksPerWorker: 5 });
            const startTime = yield workerNodes.ready().then(() => Date.now());

            // when
            yield (10).times.call(workerNodes.call.task100ms).and.waitForAllResults();

            // then
            const totalDuration = (Date.now() - startTime);
            totalDuration.should.be.within(200, 1000);
        });
    });

    describe('call timeout', function () {

        it('should not affect fast method calls', function* () {
            // given
            workerNodes = yield new WorkerNodes(fixture('async-tasks'), {
                taskTimeout: 500,
                maxWorkers: 1
            }).ready();

            // when
            const result = yield workerNodes.call.task100ms().catch(error => error);

            // then
            result.should.not.be.an.instanceOf(Error);
        });

        it('should result in an error when a single method call takes too long', function* () {
            // given
            workerNodes = yield new WorkerNodes(fixture('async-tasks'), {
                maxWorkers: 1,
                taskTimeout: 250
            }).ready();

            // when
            const result = yield workerNodes.call.task500ms().catch(error => error);

            // then
            result.should.be.an.instanceOf(errors.TimeoutError);
        });

        it('should kill the worker that was involved in processing the task', function* () {
            // given
            workerNodes = yield new WorkerNodes(fixture('async-tasks'), {
                maxWorkers: 1,
                taskTimeout: 250,
            }).ready();

            // when
            const workerPid = yield workerNodes.call.getPid();
            yield workerNodes.call.task500ms().catch(error => error);
            yield wait(20); // give the process a time to shutdown

            // then
            isRunning(workerPid).should.be.eql(false);
        });

        it('should result with rejection of all the calls that the worker was processing at the moment', function* () {
            // given
            workerNodes = yield new WorkerNodes(fixture('async-tasks'), {
                maxWorkers: 1,
                maxTasksPerWorker: 2,
                taskTimeout: 250,
            }).ready();

            // when
            const failingCall = workerNodes.call.task500ms().catch(error => error);
            yield wait(150);
            const secondCall = workerNodes.call.task100ms().catch(error => error);
            const results = yield Promise.all([failingCall, secondCall]);

            // then
            results.forEach(result => result.should.be.an.instanceOf(errors.TimeoutError));
        });

        it('should result in the spawn of a new worker', function* () {
            // given
            workerNodes = yield new WorkerNodes(fixture('async-tasks'), {
                maxWorkers: 1,
                maxTasksPerWorker: Infinity,
                taskTimeout: 250,
            }).ready();

            // when
            const pidBefore = yield workerNodes.call.getPid();
            const callResult = yield workerNodes.call.task500ms().catch(error => error);
            const pidAfter = yield workerNodes.call.getPid();

            // then
            callResult.should.be.an.instanceOf(errors.TimeoutError);
            pidBefore.should.be.a('number').that.is.not.eql(pidAfter);
        });

    });

    describe('errors in a worker', function () {

        it('should be propagated to a caller', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('messy-module'));

            // when
            const result = yield workerNodes.call.typeError().catch(error => error);

            // then
            result.should.be.an.instanceOf(Error);
        });

        it('should contain proper call stack', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('messy-module'));

            // when
            const result = yield workerNodes.call.typeError().catch(error => error);

            // then
            result.should.have.property('stack').that.has.string('tests/fixtures/messy-module.js');
        });

        it('should be propagated with error type info retained', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('messy-module'));

            // when
            const resultFoo = yield workerNodes.call.typeError().catch(error => error);
            const resultBar = yield workerNodes.call.referenceError().catch(error => error);

            // then
            resultFoo.should.be.an.instanceOf(TypeError);
            resultBar.should.be.an.instanceOf(ReferenceError);
        });

        it('should be propagated with all the custom error fields that they have', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('messy-module'));

            // when
            const resultFoo = yield workerNodes.call.customError({ foo: 1, bar: 2 }).catch(error => error);

            // then
            resultFoo.should.be.an.instanceOf(Error).that.have.any.keys({ foo: 1, bar: 2 });
        });

        it('should be wrapped in an Error object if they were promise rejections', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('messy-module'));

            // when
            const resultFoo = yield workerNodes.call.promiseRejection({ reason: 'rejection reason' }).catch(error => error);

            // then
            resultFoo.should.be.an.instanceOf(Error).that.have.any.keys({ reason: 'rejection reason' });
        });

        it('should not result in the spawn of a new worker', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('messy-module'), { maxWorkers: 1 });

            // when
            const pidBefore = yield workerNodes.call.getPid();
            yield workerNodes.call.typeError().catch(error => error);
            const pidAfter = yield workerNodes.call.getPid();

            // then
            pidBefore.should.be.a('number').that.is.eql(pidAfter);
        });
    });

    it('should reject calls that exceeds given limit', function* () {
        // given
        workerNodes = new WorkerNodes(fixture('async-tasks'), {
            maxWorkers: 2,
            maxTasksPerWorker: 5,
            maxTasks: 5
        });

        // when
        const results = yield (10).times.call(workerNodes.call.task100ms).and.waitForAllResults();

        // then
        results.slice(0, 5).forEach(result => result.should.be.eql(true));
        results.slice(5, 10).forEach(result => result.should.be.an.instanceOf(errors.MaxConcurrentCallsError));
    });

    it('should kill worker that got stuck in an infinite loop', function* () {
        // given
        workerNodes = new WorkerNodes(fixture('harmful-module'), { taskTimeout: 500, maxWorkers: 1 });

        // when
        const pid = yield workerNodes.call.getPid();
        yield workerNodes.call.infiniteLoop().catch(error => error);
        yield wait(250); // give the process a time to shutdown

        // then
        isRunning(pid).should.be.eql(false);
    });

    describe('failure recovery', function () {

        it('should be disabled by default', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('harmful-module'), { maxWorkers: 1 });

            // when
            const result = yield workerNodes.call.exitAlways().catch(error => error);

            // then
            result.should.be.an.instanceOf(errors.ProcessTerminatedError);
        });

        it('should give up after max retries limit has been reached', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('harmful-module'), { maxWorkers: 1, taskMaxRetries: 3 });

            // when
            const result = yield workerNodes.call.exitAlways().catch(error => error);

            // then
            result.should.be
                .an.instanceOf(errors.ProcessTerminatedError)
                .that.has.property('message', 'cancel after 3 retries!');
        });

        it('should be successful if previously failing task would reconsider its behaviour', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('harmful-module'), { maxWorkers: 1, taskMaxRetries: 3 });

            // when
            yield workerNodes.call.setSomeJobFailsNumber(2);
            const result = yield workerNodes.call.someJob();

            // then
            result.should.be.equal(true);
        });

        it('should put through number of retries', function* () {
            // given
            this.timeout(3000);
            workerNodes = new WorkerNodes(fixture('harmful-module'), { maxWorkers: 1, taskMaxRetries: Infinity });

            // when
            const results = yield (10).times.call(workerNodes.call.exitRandomly).and.waitForAllResults();

            // then
            results.length.should.be.at.least(10);
            unique(results).length.should.be.at.least(3);
        });

    });

    describe('raw data passing', function () {

        it('should allow to receive a raw buffer from the worker', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('buffer-ready-module'));

            // when
            const result = yield workerNodes.call.getDeflated('hello my friend!!!');
            const decoded = require('zlib').inflateSync(result).toString();

            // then
            result.should.be.an.instanceOf(Buffer);
            decoded.should.be.eql('hello my friend!!!');
        });

        it('should allow to receive a raw buffer as an object property', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('buffer-ready-module'));

            // when
            const result = yield workerNodes.call.getDeflatedInProperty('hello my friend!!!');

            // then
            result.info.should.be.a('string').that.eql('deflate');
            result.data.should.be.an.instanceOf(Buffer);
            require('zlib').inflateSync(result.data).toString().should.be.eql('hello my friend!!!');
        });

        it('should allow to send a raw buffer to the worker', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('buffer-ready-module'));

            // when
            const result = yield workerNodes.call.isBuffer(Buffer.from('foobar'));

            // then
            result.should.be.eql(true);
        });

        it('should be available in both directions', function* () {
            // given
            workerNodes = new WorkerNodes(fixture('buffer-ready-module'));

            // when
            const result = yield workerNodes.call.sliceInHalf(Buffer.from('foobar'));

            // then
            Buffer.compare(Buffer.from('foo'), result).should.be.eql(0);
        });

    });

});