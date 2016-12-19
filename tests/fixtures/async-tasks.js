const wait = (delay = 0) => new Promise(resolve => setTimeout(resolve, delay));
const returnTrue = () => true;

module.exports = {
    getPid: () => process.pid,

    task100ms: () => wait(100).then(returnTrue),
    task500ms: () => wait(500).then(returnTrue)
};