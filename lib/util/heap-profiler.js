const inspector = require('inspector');
const fs = require('fs');

class HeapProfiler {
    constructor () {
        this.session = new inspector.Session();
    }

    connect() {
        this.session.connect();
        this.resultFile = fs.openSync(`HeapSnapshot-${process.pid}-${Date.now()}.heapsnapshot`, 'w');

        this.session.on('HeapProfiler.addHeapSnapshotChunk', ({ params: { chunk }}) => {
            fs.writeSync(this.resultFile, chunk);
        });

        this.session.on('HeapProfiler.reportHeapSnapshotProgress', ({ params: { done, total }}) => {
            console.log(`heap snapshot progress: ${Math.floor(100 * (done / total))} %`);
        });
    }

    takeSnapshot(callback) {
        this.connect();

        this.session.post('HeapProfiler.takeHeapSnapshot', { reportProgress: true }, (error,r ) => {
            if (error) {
                console.log(error);
            }

            console.log(`heap snapshot done`, r);
            this.session.disconnect();
            fs.closeSync(this.resultFile);

            if (callback) { callback('heap snapshot done'); }
        });
    }
}

module.exports = HeapProfiler;
