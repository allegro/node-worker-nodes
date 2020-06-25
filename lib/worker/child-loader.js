const { parentPort } = require('worker_threads');

const { Request, Response } = require('./message');
const Profiler = require('../util/cpu-profiler');
const HeapProfiler = require('../util/heap-profiler');

let $module;

function setupModule({ modulePath }) {
    // load target module
    $module = require(modulePath);

    // setup data channel
    parentPort.on('message', callSplitter);

    // report readiness
    parentPort.postMessage('ready');
}

function callSplitter(requestData) {
    const { cmd } = requestData;

    if (cmd === 'profiler') {
        return handleProfiler(requestData);
    }

    if (cmd === 'takeSnapshot') {
        return handleHeapSnapshot(requestData);
    }

    return handleCall(requestData);
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
            parentPort.postMessage(response);
        })
        .catch(err => {
            const error = {
                type: err.constructor.name,
                message: err.message,
                stack: err.stack
            };

            Object.keys(err).forEach(key => error[key] = err[key]);
            response.error = error;

            parentPort.postMessage(response);
        });
}

function handleProfiler({ data: { duration }}) {
    const profiler = new Profiler();

    profiler.start(duration);
}

function handleHeapSnapshot(requestData) {
    const request = new Request(requestData);
    const response = Response.from(request);
    const heapProfiler = new HeapProfiler();

    heapProfiler.takeSnapshot((result) => {
        response.callId = 'takeSnapshot';
        response.setResult(result);
        parentPort.postMessage(response);
    });
}

parentPort.on('message', function ({ cmd = 'call', data }) {
    switch (cmd) {
        case 'start':
            return setupModule(data);
        case 'exit':
            return process.exit(0);
    }
});
