const data = require('fs').readFileSync(__dirname + '/../../fixtures/output.dat', 'utf8');
let memMaxWorker = process.memoryUsage().rss;

function memMeasure() {
    memMaxWorker = Math.max(memMaxWorker, process.memoryUsage().rss);
    setTimeout(memMeasure, 50);
}

function onInitialize() {
    memMeasure();
}

const workerUtils = require('node-worker-pool/nodeWorkerUtils');

function onMessage(pageDescription) {
    return Promise.resolve({
        html: JSON.stringify(pageDescription) + data,
        stats: {
            rss: Math.max(memMaxWorker, process.memoryUsage().rss),
            cpu: process.cpuUsage()
        }
    });
}

workerUtils.startWorker(onInitialize, onMessage);
