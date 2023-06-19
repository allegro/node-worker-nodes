const worker = require('worker_threads');
const child_process = require('child_process');
const EventEmitter = require('events');
const Transport = require('./transport');
const path = require('path');
const os = require('os');
const net = require('net');
const fs = require('fs');

const EXIT_WAIT_TIME_MS = 200;

const execArgsProcessor = {
    debugOptionPattern: /^(--inspect(?:-brk)?|--debug|--debug-(brk|port))(=\d+)?$/,
    offset: 1,

    map(execArgv) {
        let debugPort = 0;
        return execArgv.map(option => {
            const debugOption = option.match(this.debugOptionPattern);
            if (!debugOption) return option;
            if (debugPort === 0) debugPort = process.debugPort + this.offset++;
            return debugOption[1] + '=' + debugPort;
        });
    }
};

function createChannel(workerId, onConnect) {
    const pipeName = `${process.pid}.worker-nodes-${workerId}`;
    const socketPath = process.platform === 'win32'
      ? `\\\\?\\pipe\\${pipeName}`
      : path.join(os.tmpdir(), pipeName);

    const server = net.createServer((socket) => {
        onConnect(socket);
    });

    server.listen(socketPath);

    server.on('close', () => {
      try {
        fs.unlinkSync(socketPath)
      } catch (err) {
        console.warn(`Failed to remove pipe: ${err}`);
      }
    });

    server.on("error", (err) => {
        console.error(`Error on ${socketPath} of ${workerId}`, err);
    })
  
    return { socketPath, server }
  }

class WorkerProcess extends EventEmitter {
    constructor(modulePath, { asyncWorkerInitialization, resourceLimits, workerType, workerId }) {
        super();
        this.workerType = workerType;

        let child;
        let transportSetupPromise = null;

        if (workerType === "thread") {
            child = new worker.Worker(require.resolve('./child-loader'), {
                resourceLimits,
            });
            this._sendMessageToChild = child.postMessage.bind(child);
            this._sendDataToChild = this._sendMessageToChild;
            transportSetupPromise = Promise.resolve();
        } else if (workerType === "process") {
            let transport = null;
            let resolveWhenTransportSetup = null;
            transportSetupPromise = new Promise((_resolve) => resolveWhenTransportSetup = _resolve);
            const { socketPath } = createChannel(workerId, (socket) => {
                transport = new Transport(socket);
                transport.on('message', message => this.emit('message', message));
                resolveWhenTransportSetup();
            });
            child = child_process.fork(require.resolve('./child-loader'), {
                env: {
                    ...process.env,
                    "WORKER_NODES_PIPE_NAME": socketPath,
                },
                cwd: process.cwd(),
                execArgv: execArgsProcessor.map(process.execArgv),
                stdio: [0, 1, 2, 'ipc']
            });
            
            this._sendMessageToChild = child.send.bind(child);
            this._sendDataToChild = (message) => transport.send(message);
        } else {
            throw new Error(`Unknown worker type: ${workerType}!`);
        }

        child.once('message', () => {
            // report readiness on a first message received from the child
            // process (as it means that the child has loaded all the stuff
            // into a memory and is ready to handle the calls)
            // we also wait for the data transport to connect
            transportSetupPromise.then(() => {
                this.emit('ready');
                this.startDate = new Date();
            });

            child.on('message', message => {
                this.emit('message', message);
            });
        });

        this.child = child;

        child.on('error', error => {
            console.error(`Child workerType: ${workerType} emitted error:`, error);
            this.emit('exit', 1);
        });

        // this instance is not usable from this moment, so forward the exit event
        child.on('exit', code => {
            if (this._exitTimeoutId) {
                clearTimeout(this._exitTimeoutId);
                this._exitTimeoutId = null;
            }
            this.emit('exit', code);
        });

        // pass all the information needed to spin up the child process
        this._sendMessageToChild({ cmd: 'start', data: { modulePath, asyncWorkerInitialization } });
    }

    /**
     * Stops the worker process. It results in a trigger of an 'exit' event.
     */
    exit() {
        this._sendMessageToChild({ cmd: 'exit' });
        // If the worker is busy in a while(true); kind scenario, it's event loop won't be able to respond to our message,
        // and therefor will never exit, we must force it.
        // See: e2e/main.spec.js#should kill worker that got stuck in an infinite loop
        this._exitTimeoutId = setTimeout(() => {
            if (this.workerType === "thread") {
                console.warn(`ThreadID: ${this.child.threadId} did not exit after ${EXIT_WAIT_TIME_MS}ms, calling terminate().`);
                this.child.terminate();
            } else if (this.workerType === "process") {
                console.warn(`PID: ${this.child.pid} did not exit after ${EXIT_WAIT_TIME_MS}ms, sending SIGTERM.`);
                this.child.kill('SIGTERM');
            }
        }, EXIT_WAIT_TIME_MS);
    }

    /**
     * Processed the request object. It results in a trigger of a 'message'
     * event with a response object as a payload, when the result is ready.
     *
     * @param {Request} request
     */
    handle(request) {
        this._sendDataToChild(request);
    }
}

module.exports = WorkerProcess;