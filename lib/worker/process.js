const childProcess = require('child_process');
const EventEmitter = require('events');

const Transport = require('./transport');

const execArgsProcessor = {
    debugOptionPattern: /^(--inspect|--debug|--debug-(brk|port))(=\d+)?$/,
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

class WorkerProcess extends EventEmitter {
    constructor(modulePath, { stopTimeout }) {
        super();

        const child = childProcess.fork(require.resolve('./child-loader'), {
            env: process.env,
            cwd: process.cwd(),
            execArgv: execArgsProcessor.map(process.execArgv),
            stdio: [0, 1, 2, 'pipe', 'ipc']
        });

        const transport = new Transport(child.stdio[3]);
        transport.on('message', message => this.emit('message', message));

        this.child = child;
        this.dataTransport = transport;
        this.stopTimeout = stopTimeout;

        child.on('error', error => console.error(error));

        // this instance is not usable from this moment, so forward the exit event
        child.once('exit', code => this.emit('exit', code));

        // report readiness on a first message received from the child
        // process (as it means that the child has loaded all the stuff
        // into a memory and is ready to handle the calls)
        child.once('message', () => this.emit('ready'));

        // pass all the information needed to spin up the child process
        child.send({ cmd: 'start', data: { modulePath } });
    }

    /**
     * Stops the worker process. It results in a trigger of an 'exit' event.
     */
    exit() {
        // watchdog the stop progress and force the
        // child to exit if it all takes too long
        const timer = setTimeout(() => this.child.kill('SIGKILL'), this.stopTimeout);
        this.child.once('exit', () => clearTimeout(timer));

        // politely ask the child to stop
        this.child.send({ cmd: 'exit' });
    }

    /**
     * Processed the request object. It results in a trigger of a 'message'
     * event with a response object as a payload, when the result is ready.
     *
     * @param {Request} request
     */
    handle(request) {
        this.dataTransport.send(request);
    }
}

module.exports = WorkerProcess;