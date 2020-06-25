const inspector = require('inspector');
const fs = require('fs');

class HeapProfiler {
    constructor () {
        this.session = new inspector.Session();
    }

    connect() {
        this.session.connect();
        const resultFile = fs.openSync(`HeapSnapshot-${process.pid}-${Date.now()}.heapsnapshot`, 'w');

        this.session.on('HeapProfiler.addHeapSnapshotChunk', ({ params: { chunk }}) => {
            fs.writeSync(resultFile, chunk);
        });

        this.session.on('HeapProfiler.reportHeapSnapshotProgress', ({ params: { done, total }}) => {
            console.log(`heap snapshot progress: ${Math.floor(100 * (done / total))} %`);
        });
    }

    takeSnapshot(callback) {
        this.connect();

        this.session.post('HeapProfiler.takeHeapSnapshot', { reportProgress: true }, (error) => {
            if (error) {
                console.log(error);
            }

            console.log(`heap snapshot done`);
            this.session.disconnect();
            if (callback) { callback('heap snapshot done'); }
        });
    }
}

module.exports = HeapProfiler;