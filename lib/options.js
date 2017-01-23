const system = require('os');

/**
 * Describes a WorkerNodes options.
 *
 * @typicalname options
 */
class WorkerNodesOptions {
    constructor({
        autoStart = false,
        lazyStart = false,
        minWorkers = 0,
        maxWorkers = system.cpus().length,
        maxTasks = Infinity,
        maxTasksPerWorker = 1,
        taskTimeout = Infinity,
        taskMaxRetries = 0,
        workerEndurance = Infinity,
        workerStopTimeout = 100,
        shiftWorkers = false,
        maxMessageSize = 8 * 1024 * 1024
    } = {}) {
        /**
         * Whether should initialize the workers before a first call.
         *
         * If true, depending on the [lazyStart](#WorkerNodesOptions+lazyStart) option, it will start the
         * [min](#WorkerNodesOptions+minWorkers) or [max](#WorkerNodesOptions+maxWorkers) number of workers.
         *
         * @type {Boolean}
         * @default false
         */
        this.autoStart = Boolean(autoStart);

        /**
         * Whether should start a new worker only if all the others are busy.
         *
         * @type {Boolean}
         * @default false
         */
        this.lazyStart = Boolean(lazyStart);

        /**
         * The minimum number of workers that needs to be running to consider the whole pool as operational.
         *
         * @type {Number}
         * @default 0
         */
        this.minWorkers = Number(minWorkers);

        /**
         * The maximum number of workers that can be running at the same time.
         * Defaults to the number of cores the operating system sees.
         *
         * @type {Number}
         */
        this.maxWorkers = Number(maxWorkers);

        /**
         * The maximum number of calls that can be handled at the same time.
         * Exceeding this limit causes MaxConcurrentCallsError to be thrown.
         *
         * @type {Number}
         * @default Infinity
         */
        this.maxTasks = Number(maxTasks);

        /**
         * The number of calls that can be given to a single worker at the same time.
         *
         * @type {Number}
         * @default 1
         */
        this.maxTasksPerWorker = Number(maxTasksPerWorker);

        /**
         * The number milliseconds after which a call is considered to be lost.
         * Exceeding this limit causes TimeoutError to be thrown and a worker that performed that task to be killed.
         *
         * @type {Number}
         * @default Infinity
         */
        this.taskTimeout = Number(taskTimeout);

        /**
         * The maximum number of retries that will be performed over a task before reporting it as incorrectly terminated.
         * Exceeding this limit causes ProcessTerminatedError to be thrown.
         *
         * @type {Number}
         * @default 0
         */
        this.taskMaxRetries = Number(taskMaxRetries);

        /**
         * The maximum number of calls that a single worker can handle during its whole lifespan.
         * Exceeding this limit causes the termination of the worker.
         *
         * @type {Number}
         * @default Infinity
         */
        this.workerEndurance = Number(workerEndurance);

        /**
         * Whether to shift the stop and start of workers
         *
         * If shiftWorkers is true, and workerEndurance and autoStart is used, it shifts the stop and start of workers,
         * so they don't stop all at the same time.
         *
         * @type {Boolean}
         * @default false
         */
        this.shiftWorkers = Boolean(shiftWorkers);

        /**
         * The timeout value (in milliseconds) for the worker to stop before sending SIGKILL.
         *
         * @type {Number}
         * @default 100
         */
        this.workerStopTimeout = Number(workerStopTimeout);

        /**
         * The maximum size (in bytes) of a message that could be send to/from a worker.
         *
         * @type {Number}
         * @default 8388608
         */
        this.maxMessageSize = Number(maxMessageSize);
    }

    /**
     * Returns true if the task timeout has a finite value
     *
     * @private
     * @returns {boolean}
     */
    hasTimeout() {
        return isFinite(this.taskTimeout);
    }

    /**
     * Returns options specific to the worker
     *
     * @private
     * @returns {{srcFilePath: string, maxTasks: Number, endurance: Number, stopTimeout: Number}}
     */
    getWorkerOptions(srcFilePath) {
        return {
            srcFilePath,
            maxTasks: this.maxTasksPerWorker,
            endurance: this.workerEndurance,
            stopTimeout: this.workerStopTimeout,
            maxMessageSize: this.maxMessageSize
        }
    }
}

module.exports = WorkerNodesOptions;
