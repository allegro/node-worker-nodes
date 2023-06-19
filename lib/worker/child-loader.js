const { parentPort, threadId } = require('worker_threads');

const { Request, Response } = require('./message');
const net = require('net');
const Transport = require('./transport');
const Profiler = require('../util/cpu-profiler');
const getHeapSnapshot = require('../util/get-heap-snapshot');

let $module;
let $dataTransport;

if (threadId === 0) {
    $dataTransport = new Transport(net.connect(process.env.WORKER_NODES_PIPE_NAME));
}

const parentHandle = threadId === 0 ? process : parentPort;
const sendMessageToParent = threadId === 0 ? process.send.bind(process) : parentPort.postMessage.bind(parentPort);
let sendDataToParent = null;

process.on('uncaughtException', (err) => {
    // This might happen when parent is already exited and we try to send it messages
    // It can be commonly seen in tests
    if (err.message === "write EPIPE" || err.message.includes(`connect ENOENT ${process.env.WORKER_NODES_PIPE_NAME}`)) {
        return;
    }
    console.error(`Parent PID: ${process.ppid} Child PID: ${process.pid} ThreadID: ${threadId} encountered an error: ${err.message}`, err.stack);
});

function setupModule({ modulePath, asyncWorkerInitialization }) {
    // load target module
    $module = require(modulePath);

    // setup data channel
    if (threadId === 0 && $dataTransport) {
        $dataTransport.on('message', callSplitter);
        sendDataToParent = (message) => $dataTransport.send(message);
    } else {
        parentHandle.on('message', callSplitter);
        sendDataToParent = sendMessageToParent;
    }

    // report readiness
    if (!asyncWorkerInitialization) {
        sendMessageToParent('ready');
    }
}

function callSplitter(requestData) {
    const { cmd } = requestData;

    if (cmd === 'profiler') {
        return handleProfiler(requestData);
    }

    if (cmd === 'takeSnapshot') {
        return handleHeapSnapshot(requestData);
    }

    if (cmd === 'request') {
        return handleCall(requestData);
    }
}

function handleCall(requestData) {
    const request = new Request(requestData);
    const response = Response.from(request);

    const args = request.args || [];
    const target = request.method === '__module__' ? $module : $module[request.method];
    const func = typeof target == 'function' ? target.bind($module) : null;

    return new Promise(resolve => {
        if (!func) throw new TypeError(`${request.method} is not a function`);
        resolve(func(...args));
    })
        .then(result => {
            response.setResult(result);
            sendDataToParent(response);
        })
        .catch(err => {
            const error = {
                type: err.constructor.name,
                message: err.message,
                stack: err.stack
            };

            Object.keys(err).forEach(key => error[key] = err[key]);
            response.error = error;

            sendDataToParent(response);
        });
}

function handleProfiler({ data: { duration }}) {
    const profiler = new Profiler();

    profiler.start(duration);
}

function handleHeapSnapshot(requestData) {
    const request = new Request(requestData);
    const response = Response.from(request);

    getHeapSnapshot((result) => {
        response.callId = 'takeSnapshot';
        response.setResult(result);
        sendMessageToParent(response);
    });
}

parentHandle.on('message', function ({ cmd = 'call', data }) {
    switch (cmd) {
        case 'start':
            return setupModule(data);
        case 'exit':
            return process.exit(0);
    }
});
