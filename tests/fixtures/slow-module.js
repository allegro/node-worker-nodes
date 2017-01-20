const wait = (delay = 0) => new Promise(resolve => setTimeout(resolve, delay));
const returnTrue = () => true;

// Simulate slow startup of 0.3 seconds
const end = process.uptime() + 0.3;
while (end > process.uptime()) {}


module.exports = {
    getPid: () => process.pid,
    task100ms: () => wait(100).then(returnTrue),
    task200ms: () => wait(200).then(returnTrue),
    exit: () => process.exit(-1)
};
