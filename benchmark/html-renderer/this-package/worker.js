const data = require('fs').readFileSync(__dirname + '/../../fixtures/output.dat', 'utf8');
let memMaxWorker = process.memoryUsage().rss;

function memMeasure() {
    memMaxWorker = Math.max(memMaxWorker, process.memoryUsage().rss);
    setTimeout(memMeasure, 50);
}

memMeasure();

module.exports = {
    renderHTML(pageDescription) {
        return {
            html: JSON.stringify(pageDescription) + data,
            stats: {
                rss: Math.max(memMaxWorker, process.memoryUsage().rss),
                cpu: process.cpuUsage()
            }
        };
    }
};