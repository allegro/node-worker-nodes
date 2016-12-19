const Sequence = require('./util/sequence');

const taskSerial = new Sequence(1);

class Task {
    constructor({ method, args, resolve, reject }) {
        this.id = taskSerial.nextValue();
        this.method = method;
        this.args = args;
        this.retries = 0;
        this.timer = null;

        this._resolve = resolve;
        this._reject = reject;
    }

    resolve(...args) {
        return this._resolve(...args);
    }

    reject(...args) {
        clearTimeout(this.timer);
        return this._reject(...args);
    }

    incrementRetries() {
        this.retries += 1;
    }

    hasReached(retriesLimit) {
        return this.retries >= retriesLimit;
    }
}

module.exports = Task;