const worker = require('worker_threads');
const EventEmitter = require('events');

class WorkerProcess extends EventEmitter {
    constructor(modulePath, { stopTimeout }) {
        super();

        const child = new worker.Worker(require.resolve('./child-loader'));

        child.once('message', () => {
            // report readiness on a first message received from the child
            // process (as it means that the child has loaded all the stuff
            // into a memory and is ready to handle the calls)
            this.emit('ready');
            this.startDate = new Date();

            child.on('message', message => {
                this.emit('message', message);
            });
        });

        this.child = child;
        this.stopTimeout = stopTimeout;

        child.on('error', error => console.error(error));

        // this instance is not usable from this moment, so forward the exit event
        child.on('exit', code => this.emit('exit', code));

        // pass all the information needed to spin up the child process
        child.postMessage({ cmd: 'start', data: { modulePath } });
    }

    /**
     * Stops the worker process. It results in a trigger of an 'exit' event.
     */
    exit() {
        this.child.postMessage({ cmd: 'exit' });
    }

    /**
     * Processed the request object. It results in a trigger of a 'message'
     * event with a response object as a payload, when the result is ready.
     *
     * @param {Request} request
     */
    handle(request) {
        this.child.postMessage(request);
    }
}

module.exports = WorkerProcess;