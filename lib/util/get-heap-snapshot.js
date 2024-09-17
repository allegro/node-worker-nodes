const v8 = require('v8');

const hasEnoughMemory = () => {
    const heapStats = v8.getHeapStatistics();
    return heapStats.heap_size_limit >= heapStats.used_heap_size * 2;
}

const getHeapSnapshot = (callback) => {
    if (hasEnoughMemory()) {
        const filePath = v8.writeHeapSnapshot(`HeapSnapshot-${process.pid}-${Date.now()}.heapsnapshot`);
        callback(filePath);
    } else {
        callback(undefined, {
            type: 'Error',
            message: 'Not enough memory to perform heap snapshot'
        });
    }
}

module.exports = getHeapSnapshot;
