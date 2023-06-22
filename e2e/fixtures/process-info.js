const { threadId } = require("worker_threads");
const processStartTime = Date.now() - process.uptime() * 1000;

module.exports = {
    getPid: () => process.pid,
    getThreadId: () => threadId,
    getStartTime: () => processStartTime,
    noop: () => {}
};