// Simulate slow startup of 0.3 seconds
const end = process.uptime() + 0.3;
while (end > process.uptime()) {}


module.exports = {
    getPid: () => process.pid
};
