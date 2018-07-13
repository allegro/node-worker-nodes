const WorkerNodes = require('../');
const errors = require('../lib/errors');

const { wait, unique, isRunning } = require('./utils');
const { givenWorkerPoolWith, givenStartedWorkerPoolWith, shutdown } = require('./worker-nodes-test-support');

describe('worker nodes', function () {

    after(shutdown);

    it('should be exposed as a constructor function', function () {
        // given
        const callWithoutNew = () => WorkerNodes();

        // expect
        callWithoutNew.should.throw(TypeError, "cannot be invoked without 'new'");
    });

    it('should report its readiness', function* () {
        // given
        const workerNodes = givenWorkerPoolWith('process-info');

        // when
        const ready = yield workerNodes.ready();

        // then
        ready.should.be.truthy;
    });

    describe('function proxying', function () {

        it('should be exposed as a function named call', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('echo-function-sync');

            // expect
            workerNodes.should.have.property('call').that.is.a('function');
        });

        it('should support single, synchronous function', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('echo-function-sync');

            // when
            const result = yield workerNodes.call('hello!');

            // then
            result.should.be.eql('hello!');
        });

        it('should support single, asynchronous function', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('echo-function-async');

            // when
            const result = yield workerNodes.call('hello!');

            // then
            result.should.be.eql('hello!');
        });

        it('should support module that exports multiple functions', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('echo-module-callable');

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
            const workerNodes = givenWorkerPoolWith('echo-module-plain');

            // when
            const result = yield workerNodes.call.echoMethod('this retained!');

            // then
            result.should.be.eql('this retained!');
        });

        it('should fail when trying to call directly a module that is not a function', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('echo-module-plain');

            // when
            const result = yield workerNodes.call().catch(error => error);

            // then
            result.should.be.an.instanceOf(TypeError).that.have.property('message', '__module__ is not a function');
        });

        it('should fail when trying to call a property that is not a function', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('echo-module-plain');

            // when
            const result = yield workerNodes.call.echo().catch(error => error);

            // then
            result.should.be.an.instanceOf(TypeError).that.have.property('message', 'echo is not a function');
        });

        it('should fail when dealing with non-existing function', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('echo-function-sync');

            // when
            const result = yield workerNodes.call.nonExistingFunction().catch(error => error);

            // then
            result.should.be.an.instanceOf(TypeError).that.have.property('message', 'nonExistingFunction is not a function');
        });

    });

    it('should allow to load a module that has dependencies', function* () {
        // given
        const workerNodes = givenWorkerPoolWith('echo-module-with-imports');

        // when
        const result = yield workerNodes.call.echoSync('hello!');

        // then
        result.should.be.eql('hello!');
    });

    it('should use the same process as the caller does', function* () {
        // given
        const workerNodes = givenWorkerPoolWith('process-info');

        // when
        const result = yield workerNodes.call.getPid();

        // then
        result.should.be.a('number').that.eql(process.pid);
    });

    it('should allow limit the number of workers active in a given time', function* () {
        // given
        const workerNodes = givenWorkerPoolWith('process-info', { maxWorkers: 1 });

        // when
        const results = yield (10).times.call(workerNodes.call.getPid).and.waitForAllResults();

        // then
        unique(results).should.have.lengthOf(1);
    });

    it('should not use a single worker more times than a given limit', function* () {
        // given
        const workerNodes = givenWorkerPoolWith('process-info', { maxWorkers: 1, workerEndurance: 2 });

        // when
        yield (10).times.call(workerNodes.call.noop).and.waitForAllResults();

        // then
        workerNodes.workersQueue.forEach(worker => worker.tasksStarted.should.be.at.most(2));
    });

    it('should distribute the work evenly among available workers', function* () {
        // given
        const workerNodes = yield givenStartedWorkerPoolWith('process-info', { autoStart: true, maxWorkers: 10, minWorkers: 10 });

        // when
        const results = yield (10).times.call(workerNodes.call.getPid).and.waitForAllResults();

        // then
        workerNodes.workersQueue.forEach(worker => worker.tasksStarted.should.eql(1));
    });

    describe('auto-start', function () {

        it('should be disabled by default', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('process-info');

            // when
            const callTime = Date.now();
            yield workerNodes.call.noop();

            // then
            workerNodes.workersQueue.forEach(worker => {
                const startDate = worker.process.startDate;
                if (startDate) {
                    startDate.should.be.at.least(callTime);
                }
            });
        });

        it('should result in spawn of the workers before the first call if active', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('process-info', { autoStart: true, maxWorkers: 1 });

            // when
            yield wait(500);
            const callTime = Date.now();
            const workerStartTime = yield workerNodes.call.getStartTime();

            // then
            workerStartTime.should.be.at.most(callTime);
        });

        it('should force the workerNodes to wait for all the required workers to start before reporting ready', function* () {
            // given
            const workerNodes = yield givenStartedWorkerPoolWith('process-info', { autoStart: true, minWorkers: 4, maxWorkers: 4 });
            const callStartTime = Date.now();

            // when
            const results = yield (4).times.call(workerNodes.call.getStartTime).and.waitForAllResults();

            // then
            results.should.have.lengthOf(4);
            results.forEach(result => result.should.be.at.most(callStartTime));
        });

        it('should only use workers that are fully initialized', function* () {
            // given
            const workerNodes = yield givenStartedWorkerPoolWith('slow-module', {
              autoStart: true,
              minWorkers: 2,
              maxWorkers: 2,
              taskMaxRetries: Infinity
            });

            yield (4).times.call(workerNodes.call.getPid).and.waitForAllResults();

            // when
            workerNodes.workersQueue.storage[0].process.exit();
            yield (4).times.call(workerNodes.call.getPid).and.waitForAllResults();

            const results = workerNodes.workersQueue.filter(worker => worker.isProcessAlive);

            // then
            unique(results).should.have.lengthOf(1);
        });

    });

    describe('lazy start', function () {

        it('should be disabled by default', function* () {
            // given
            const workerNodes = yield givenStartedWorkerPoolWith('process-info', { autoStart: true, minWorkers: 2, maxWorkers: 4 });
            const callStartTime = Date.now();

            // when
            const results = yield (4).times.call(workerNodes.call.getStartTime).and.waitForAllResults();

            // then
            results.should.have.lengthOf(4);
            results.forEach(result => result.should.be.at.most(callStartTime));
        });

        it('should cause only the minimum required number of workers to start at init', function* () {
            // given
            const workerNodes = yield givenStartedWorkerPoolWith('process-info', {
                autoStart: true,
                lazyStart: true,
                minWorkers: 2,
                maxWorkers: 4
            });
            const callStartTime = Date.now();

            // when
            yield (4).times.call(workerNodes.call.noop).and.waitForAllResults();
            const results = workerNodes.workersQueue.map(worker => worker.process.startDate);

            // then
            results.should.have.lengthOf(4);
            results.slice(0, 2).forEach(result => result.should.be.at.most(callStartTime));
            results.slice(2, 4).forEach(result => result.should.be.at.least(callStartTime));
        });

        it('should not affect work assignment to the workers by default', function* () {
            // given
            const workerNodes = yield givenStartedWorkerPoolWith('process-info', {
                autoStart: true,
                minWorkers: 3,
                maxWorkers: 3
            });

            // when
            yield workerNodes.call.getPid();
            yield workerNodes.call.getPid();
            yield workerNodes.call.getPid();
            const result = workerNodes.workersQueue.map(worker => worker.tasksStarted);

            // then
            result.should.deep.equal([1, 1, 1]);
        });

        it('should cause maximum utilization of the existing workers if calls are sequential', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('process-info', {
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
            const workerNodes = givenWorkerPoolWith('process-info', {
                lazyStart: true,
                minWorkers: 1,
                maxWorkers: 3
            });

            // when
            yield (4).times.call(workerNodes.call.noop).and.waitForAllResults();

            // then
            workerNodes.workersQueue.storage.should.have.lengthOf(3);
        });

    });

    describe('worker processing concurrency', function () {

        it('should be limited to one by default', function* () {
            // given
            const workerNodes = yield givenStartedWorkerPoolWith('async-tasks', { maxWorkers: 1 });
            const startTime = Date.now();

            // when
            yield (10).times.call(workerNodes.call.task100ms).and.waitForAllResults();

            // then
            const totalDuration = (Date.now() - startTime);
            totalDuration.should.be.at.least(1000);
        });

        it('should allow to limit the amount of concurrent calls sent to a single worker', function* () {
            const workerNodes = yield givenStartedWorkerPoolWith('async-tasks', { maxWorkers: 1, maxTasksPerWorker: 5 });
            const startTime = Date.now();

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
            const workerNodes = yield givenStartedWorkerPoolWith('async-tasks', {taskTimeout: 500, maxWorkers: 1});

            // when
            const result = yield workerNodes.call.task100ms().catch(error => error);

            // then
            result.should.not.be.an.instanceOf(Error);
        });

        it('should result in an error when a single method call takes too long', function* () {
            // given
            const workerNodes = yield givenStartedWorkerPoolWith('async-tasks', {taskTimeout: 250, maxWorkers: 1});

            // when
            const result = yield workerNodes.call.task500ms().catch(error => error);

            // then
            result.should.be.an.instanceOf(errors.TimeoutError);
        });

        it('should kill the worker that was involved in processing the task', function* () {
            // given
            const workerNodes = yield givenStartedWorkerPoolWith('async-tasks', {taskTimeout: 250, maxWorkers: 1});

            // when
            yield workerNodes.call.task500ms().catch(error => error);
            yield wait(20); // give the process a time to shutdown

            // then
            workerNodes.workersQueue.storage.should.have.lengthOf(0);
        });

        it('should result with rejection of all the calls that the worker was processing at the moment', function* () {
            //note: (non deterministic test) this test fails sometimes

            // given
            const workerNodes = yield givenStartedWorkerPoolWith('async-tasks', {
              autoStart: true,
              minWorkers: 1,
              maxWorkers: 1,
              maxTasksPerWorker: 2,
              taskTimeout: 250,
            });

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
            const workerNodes = yield givenStartedWorkerPoolWith('async-tasks', {
              maxWorkers: 1,
              maxTasksPerWorker: Infinity,
              taskTimeout: 250,
            });

            // when
            yield workerNodes.call.noop();
            const idBefore = workerNodes.workersQueue.storage[0].id;
            const callResult = yield workerNodes.call.task500ms().catch(error => error);
            yield workerNodes.call.noop();
            const idAfter = workerNodes.workersQueue.storage[0].id;

            // then
            callResult.should.be.an.instanceOf(errors.TimeoutError);
            idBefore.should.be.a('number').that.is.not.eql(idAfter);
        });

    });

    describe('errors in a worker', function () {

        it('should be propagated to a caller', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('messy-module');

            // when
            const result = yield workerNodes.call.typeError().catch(error => error);

            // then
            result.should.be.an.instanceOf(Error);
        });

        it('should contain proper call stack', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('messy-module');

            // when
            const result = yield workerNodes.call.typeError().catch(error => error);

            // then
            result.should.have.property('stack').that.has.string('tests/fixtures/messy-module.js');
        });

        it('should be propagated with error type info retained', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('messy-module');

            // when
            const resultFoo = yield workerNodes.call.typeError().catch(error => error);
            const resultBar = yield workerNodes.call.referenceError().catch(error => error);

            // then
            resultFoo.should.be.an.instanceOf(TypeError);
            resultBar.should.be.an.instanceOf(ReferenceError);
        });

        it('should be propagated with all the custom error fields that they have', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('messy-module');

            // when
            const resultFoo = yield workerNodes.call.customError({ foo: 1, bar: 2 }).catch(error => error);

            // then
            resultFoo.should.be.an.instanceOf(Error).that.have.any.keys({ foo: 1, bar: 2 });
        });

        it('should be wrapped in an Error object if they were promise rejections', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('messy-module');

            // when
            const resultFoo = yield workerNodes.call.promiseRejection({ reason: 'rejection reason' }).catch(error => error);

            // then
            resultFoo.should.be.an.instanceOf(Error).that.have.any.keys({ reason: 'rejection reason' });
        });

        it('should not result in the spawn of a new worker', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('messy-module', { maxWorkers: 1 });

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
        const workerNodes = yield givenStartedWorkerPoolWith('async-tasks', {
            autoStart: true,
            minWorkers: 2,
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
        this.timeout(1500);
        const workerNodes = givenWorkerPoolWith('harmful-module', { taskTimeout: 500, maxWorkers: 1 });

        // when
        const result = yield workerNodes.call.infiniteLoop().catch(error => error);

        // then
        result.should.be.an.instanceOf(errors.TimeoutError);
    });

    describe('failure recovery', function () {

        it('should be disabled by default', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('harmful-module', { maxWorkers: 1 });

            // when
            const result = yield workerNodes.call.exitAlways().catch(error => error);

            // then
            result.should.be.an.instanceOf(errors.ProcessTerminatedError);
        });

        it('should give up after max retries limit has been reached', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('harmful-module', { maxWorkers: 1, taskMaxRetries: 3 });

            // when
            const result = yield workerNodes.call.exitAlways().catch(error => error);

            // then
            result.should.be
                .an.instanceOf(errors.ProcessTerminatedError)
                .that.has.property('message', 'cancel after 3 retries!');
        });

        it('should be successful if previously failing task would reconsider its behaviour', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('harmful-module', { maxWorkers: 1, taskMaxRetries: 3 });

            // when
            yield workerNodes.call.setSomeJobFailsNumber(2);
            const result = yield workerNodes.call.someJob();

            // then
            result.should.be.equal(true);
        });

        it('should put through number of retries', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('harmful-module', { maxWorkers: 1, taskMaxRetries: Infinity });
            this.timeout(5000);

            // when
            const results = yield (10).times.call(workerNodes.call.exitRandomly).and.waitForAllResults();

            // then
            results.length.should.be.equal(10);
        });

    });

    describe('raw data passing', function () {

        it('should allow to receive a Uint8Array from the worker', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('buffer-ready-module');

            // when
            const result = yield workerNodes.call.getDeflated('hello my friend!!!');
            const decoded = require('zlib').inflateSync(result).toString();

            // then
            result.should.be.an.instanceOf(Uint8Array);
            decoded.should.be.eql('hello my friend!!!');
        });

        it('should allow to receive a Uint8Array as an object property', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('buffer-ready-module');

            // when
            const result = yield workerNodes.call.getDeflatedInProperty('hello my friend!!!');

            // then
            result.info.should.be.a('string').that.eql('deflate');
            result.data.should.be.an.instanceOf(Uint8Array);
            require('zlib').inflateSync(result.data).toString().should.be.eql('hello my friend!!!');
        });

        it('should allow to send a Uint8Array to the worker', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('buffer-ready-module');

            // when
            const result = yield workerNodes.call.isUint8Array(Buffer.from('foobar'));

            // then
            result.should.be.eql(true);
        });

        it('should be available in both directions', function* () {
            // given
            const workerNodes = givenWorkerPoolWith('buffer-ready-module');

            // when
            const result = yield workerNodes.call.sliceInHalf(Buffer.from('foobar'));

            // then
            Buffer.compare(Buffer.from('foo'), result).should.be.eql(0);
        });

    });

});
