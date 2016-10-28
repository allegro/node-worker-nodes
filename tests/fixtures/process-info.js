const processStartTime = Date.now() - process.uptime() * 1000;

module.exports = {
    getPid: () => process.pid,
    getStartTime: () => processStartTime
};