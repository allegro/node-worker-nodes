const net = require('net');

const { Request, Response } = require('./message');
const Transport = require('./transport');

let $module;
let $cmdTransport = process;
let $dataTransport;

function setupModule({ modulePath }) {
    // load target module
    $module = require(modulePath);

    // setup data transport channel
    $dataTransport = new Transport(new net.Socket({ fd: 3 }));
    $dataTransport.on('message', handleCall);

    // report readiness
    $cmdTransport.send('ready');
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
            $dataTransport.send(response);
        })
        .catch(err => {
            const error = {
                type: err.constructor.name,
                message: err.message,
                stack: err.stack
            };

            Object.keys(err).forEach(key => error[key] = err[key]);
            response.error = error;

            $dataTransport.send(response);
        });
}

$cmdTransport.on('message', function ({ cmd = 'call', data }) {
    switch (cmd) {
        case 'start':
            return setupModule(data);
        case 'exit':
            return process.exit(0);
    }
});