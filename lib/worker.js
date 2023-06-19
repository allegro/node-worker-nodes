const EventEmitter = require('events');

const WorkerProcess = require('./worker/process');
const Sequence = require('./util/sequence');
const messages = require('./worker/message');

const ProcessRequest = messages.Request;
const ProcessResponse = messages.Response;

const workerSerial = new Sequence(1);

class Worker extends EventEmitter {
    constructor({ srcFilePath, maxTasks, endurance, stopTimeout, asyncWorkerInitialization, resourceLimits, workerType }) {
        super();

        this.id = workerSerial.nextValue();
        this.calls = new Map();
        this.tasksStarted = 0;
        this.maxTasks = maxTasks;
        this.endurance = endurance;
        this.isTerminating = false;
        this.isProcessAlive = false;

        const process = this.process = new WorkerProcess(srcFilePath, { workerId: this.id, stopTimeout, asyncWorkerInitialization, resourceLimits, workerType });

        process.once('ready', () => {
            this.isProcessAlive = true;
            this.emit('ready');
        });

        process.on('message', data => {
            const response = new ProcessResponse(data);
            this.emit('data', response);
        });

        process.once('exit', code => {
            this.exitCode = code;
            this.isProcessAlive = false;
            this.emit('exit', code);
        });
    }

    /**
     *
     * @param {Task} task
     */
    handle(task) {
        this.calls.set(task.id, task);
        this.tasksStarted += 1;

        this.process.handle(new ProcessRequest({
            callId: task.id,
            workerId: this.id,
            method: task.method,
            args: task.args
        }));
    }

    /**
     * Gets all in-progress/unhandled calls from the worker.
     *
     * @returns {Array.<Task>}
     */
    withdrawTasks() {
        const unhandledCalls = Array.from(this.calls.values());
        this.calls.clear();
        return unhandledCalls;
    }

    /**
     *
     * @returns {number}
     */
    get activeCalls() {
        return this.calls.size;
    }

    /**
     *
     * @returns {boolean}
     */
    isOperational() {
        return this.isProcessAlive && !this.isTerminating;
    }

    /**
     *
     * @returns {boolean}
     */
    isBusy() {
        return this.activeCalls > 0;
    }

    /**
     *
     * @returns {boolean}
     */
    canAcceptWork() {
        return !this.isTerminating
            && this.activeCalls < this.maxTasks
            && this.tasksStarted < this.endurance;
    }

    /**
     *
     * @returns {boolean}
     */
    isProcessAlive() {
        return this.isProcessAlive;
    }

    /**
     *
     * @returns {boolean}
     */
    isExhausted() {
        return this.tasksStarted >= this.endurance;
    }

    /**
     *
     */
    stop() {
        this.isTerminating = true;
        this.process.exit();
    }

    /**
     *  @param {number} duration
     */
    profiler(duration) {
        this.process.handle({ cmd: 'profiler', data: { duration }});
    }

    /**
     *
     */
    takeSnapshot() {
        const cmd = 'takeSnapshot';
        this.calls.set(cmd, {
            timer: null,
            reject: () => {},
            resolve: () => {},
        });

        this.process.handle({ cmd });
    }
}

module.exports = Worker;
