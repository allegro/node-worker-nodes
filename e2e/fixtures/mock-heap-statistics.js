const v8 = require("v8");

module.exports = function mockHeapStatistics () {
    v8.getHeapStatistics = () => ({
        heap_size_limit: 100,
        used_heap_size: 55,
    })
};
