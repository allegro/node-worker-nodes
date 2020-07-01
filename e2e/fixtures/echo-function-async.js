const wait = (delay = 0) => new Promise(resolve => setTimeout(resolve, delay));

module.exports = function echo (msg = '', timeout = 10) {
    return wait(timeout).then(() => msg);
};