const v8 = require('v8');
const fs = require('fs');

const getHeapSnapshot = (callback) => {
    const stream = v8.getHeapSnapshot();
    const file = fs.createWriteStream(`HeapSnapshot-${process.pid}-${Date.now()}.heapsnapshot`);

    stream.on('data', (chunk) => file.write(chunk));

    stream.on('end', () => {
        if (callback) { callback('heap snapshot done'); }
    });
}

module.exports = getHeapSnapshot;