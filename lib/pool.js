const EventEmitter = require('events');

const { TimeoutError, ProcessTerminatedError, MaxConcurrentCallsError } = require('./errors');
const Worker = require('./worker');
const Task = require('./task');
const Queue = require('./util/queue');

const WorkerNodesOptions = require('./options');

class WorkerNodes extends EventEmitter {

    /**
     * @param {String} path - An absolute path to the module that will be run in the workers.
     * @param {Object} [options] - See [WorkerNodesOptions](#WorkerNodesOptions) for a detailed description.
     */
    constructor(path, options) {
        super();

        this.options = new WorkerNodesOptions(options);
        this.workerOptions = this.options.getWorkerOptions(path);

        this.workersQueue = new Queue({ sizeLimit: this.options.maxWorkers });
        this.pendingTasksQueue = new Queue();
        this.ongoingTasksQueue = new Queue({ sizeLimit: this.options.maxTasks });

        // setup proxying of target module api
        const makeHandleFor = method => (...args) => {
            if (this.ongoingTasksQueue.isFull()) {
                return Promise.reject(new MaxConcurrentCallsError('Too many concurrent calls (' + this.ongoingTasksQueue.length + ')'));
            }

            return new Promise((resolve, reject) => this.enqueue(new Task({ method, args, resolve, reject })));
        };

        this.callHandlers = {};

        /**
         * This exposes the api of a module that the worker nodes are working on. If the module is a function, you
         * can call this directly. If the module exports multiple functions, you can call them as they were properties
         * of this proxy.
         *
         * @type {Proxy}
         */
        this.call = new Proxy(function () {}, {
            get: (target, property) => {
                let callHandler = this.callHandlers[property];

                if (!callHandler) {
                    callHandler = this.callHandlers[property] = makeHandleFor(property);
                }

                return callHandler;
            },

            apply: (target, thisArg, args) => this.call.__module__(...args)
        });

        this.isTerminationStarted = false;
        this.isTerminated = false;
        this.isReady = new Promise(resolve => {
            const checkReadiness = count => {
                if (count >= this.options.minWorkers) {
                    resolve(true);
                    this.removeListener('workers-ready', checkReadiness);
                }
            };

            this.on('workers-ready', checkReadiness);

            if (this.options.autoStart) {
                if (this.options.lazyStart) {
                    for (let i = 0; i < this.options.minWorkers; i++) this.startWorker();
                } else {
                    while (this.canStartWorker()) this.startWorker();
                }
            }

            checkReadiness(0);
        });
    }

    /**
     * A method to check if the minimum required number of workers are ready to serve the calls.
     *
     * @returns {Promise} resolves with a [WorkerNodes](#WorkerNodes) instance
     */
    ready() {
        return this.isReady.then(() => this);
    }

    /**
     * @private
     * @returns {boolean}
     */
    get shutdownInProgress() {
        return this.isTerminationStarted && !this.isTerminated;
    }

    /**
     * When a child exits, check if there are any outstanding tasks and put them in the pending queue.
     *
     * @private
     * @param {Worker} worker
     */
    handleWorkerExit(worker) {
        const tasks = worker.withdrawTasks();

        tasks
            .filter(task => task.hasReached(this.options.taskMaxRetries))
            .forEach(task => {
                this.rejectTask(task, new ProcessTerminatedError('cancel after ' + task.retries + ' retries!'))
            });

        tasks
            .filter(task => !task.hasReached(this.options.taskMaxRetries))
            .forEach(task => {
                task.incrementRetries();
                this.pendingTasksQueue.enqueue(task);
            });

        this.workersQueue.remove(worker);

        if (this.canStartWorker()) this.startWorker();

        this.processQueue();
    }

    /**
     * Checks the number of workers that are operational and emits it in an event.
     *
     * @private
     */
    emitReadyWorkersCount() {
        const operationalWorkersCount = this.workersQueue.filter(worker => worker.isOperational()).length;
        this.emit('workers-ready', operationalWorkersCount);
    }

    /**
     *
     * @private
     * @returns {boolean} true if it's possible to spawn a new worker
     */
    canStartWorker() {
        return !this.isTerminationStarted && !this.workersQueue.isFull();
    }

    /**
     * Spawns and setups a new worker.
     *
     * @private
     */
    startWorker() {
        const worker = new Worker(this.workerOptions);

        worker.on('ready', () => {
            this.emitReadyWorkersCount();
            if (!this.options.lazyStart) {
                this.pendingTasksQueue.forEach(() => this.processQueue());
            }
        });
        worker.on('data', response => this.handleWorkerResponse(worker, response));
        worker.on('exit', () => this.handleWorkerExit(worker));

        this.workersQueue.enqueue(worker);

        return worker;
    }

    /**
     * Removes the task from active tasks list and then rejects it.
     *
     * @param {Task} task
     * @param {Error} reason
     * @private
     */
    rejectTask(task, reason) {
        this.ongoingTasksQueue.remove(task);
        task.reject(reason);
    }

    /**
     * called from a child process, the data contains information needed to
     * look up the child and the original call so we can invoke the callback
     *
     * @param {Worker} worker
     * @param {Response} workerResponse
     * @private
     * @returns {*}
     */
    handleWorkerResponse(worker, workerResponse) {
        if (worker.isTerminating) return;

        const call = worker.calls.get(workerResponse.callId);

        if (this.options.hasTimeout()) {
            clearTimeout(call.timer);
        }

        process.nextTick(function () {
            if (workerResponse.error) {
                call.reject(workerResponse.error);
            } else {
                call.resolve(workerResponse.result);
            }
        });

        worker.calls.delete(workerResponse.callId);
        this.ongoingTasksQueue.remove(call);

        if (worker.isExhausted() && !worker.isBusy()) {
            worker.stop();
        }

        this.processQueue();
    }

    /**
     * Handles the worker timeout by rejecting all the tasks that was in progress state and killing the worker.
     *
     * @param {Worker} worker
     * @private
     */
    handleWorkerTimeout(worker) {
        const tasks = worker.withdrawTasks();
        tasks.forEach(task => this.rejectTask(task, new TimeoutError('worker call timed out!')));
        worker.stop();
    }

    /**
     * Sends a pending task to the worker.
     *
     * @param {Worker} worker
     * @private
     */
    dispatchTaskTo(worker) {
        const task = this.pendingTasksQueue.dequeue();
        this.ongoingTasksQueue.enqueue(task);

        worker.handle(task);

        if (this.options.hasTimeout()) {
            task.timer = setTimeout(() => this.handleWorkerTimeout(worker), this.options.taskTimeout);
        }
    }

    /**
     * Gets the next available worker.
     *
     * @private
     * @returns {Worker}
     */
    pickWorker() {
        if (this.options.lazyStart) {
            let worker = this.workersQueue.find(worker => worker.canAcceptWork());

            if (!worker && this.canStartWorker()) {
                worker = this.startWorker();
            }

            if (worker) {
                this.workersQueue.requeue(worker);
                return worker;
            }
        } else {
            let worker = this.workersQueue.find(worker => worker.canAcceptWork() && worker.isProcessAlive);

            if (this.canStartWorker()) {
                this.startWorker();
            }

            if (worker) {
                this.workersQueue.requeue(worker);
                return worker;
            }
        }
    }

    /**
     * Picks up the next task that was waiting in the queue and tries to dispatch it to a worker.
     *
     * @private
     */
    processQueue() {
        if (!this.pendingTasksQueue.isEmpty()) {
            const worker = this.pickWorker();

            if (worker) {
                this.dispatchTaskTo(worker);
            }
        }

        this.checkShutdown();
    }

    /**
     * Adds the call to the queue, then triggers a processing of the queue.
     *
     * @param {Task} task
     * @private
     * @returns {*}
     */
    enqueue(task) {
        if (this.isTerminationStarted) {
            // don't add anything new to the queue
            return this.checkShutdown();
        }
        this.pendingTasksQueue.enqueue(task);
        this.processQueue();
    }

    /**
     * Starts the process of terminating this instance.
     *
     * @returns {Promise} - resolved when the instance is terminated.
     */
    terminate() {
        this.isTerminationStarted = true;
        this.checkShutdown();

        return this.isTerminated
            ? Promise.resolve()
            : new Promise(resolve => this.on('terminated', resolve));
    }

    /**
     * Kills the workers when they're all done.
     *
     * @private
     */
    checkShutdown() {
        if (!this.shutdownInProgress) return;

        let busyWorkersCount = 0;

        this.workersQueue.forEach(worker => {
            if (worker.isBusy()) {
                busyWorkersCount += 1;
            } else {
                worker.stop();
            }
        });

        if (busyWorkersCount === 0) {
            this.isTerminated = true;
            this.emit('terminated');
        }
    }


    /**
     * Run CPU Profiler and save result on main process directory
     *
     * @param {number} duration
     * @returns {void}
     */
    profiler(duration) {
        const worker = this.pickWorker();

        if (worker) {
            worker.profiler(duration);
        }
    }

    /**
     * Take Heap Snapshot and save result on main process directory
     *
     * @returns {void}
     */
    takeSnapshot() {
        const worker = this.pickWorker();

        if (worker) {
            worker.takeSnapshot();
        }
    }

    /**
     * Return list with used workers in pool
     *
     * @returns {Array.<Worker>}
     */
    getUsedWorkers() {
        return this.workersQueue.storage.map(worker => worker.process.child);
    }
}

module.exports = WorkerNodes;
