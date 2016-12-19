let _timer = new WeakMap();
let _startTime = new WeakMap();

class BenchmarkResult {
    constructor({
        name,
        timeTotal = null,
        timeUsr = null,
        timeSys = null,
        timeUsrWorker = null,
        timeSysWorker = null,
        memRss = null,
        memRssWorker = null,
        errors = 0
    }) {
        this.name = name;
        this.timeTotal = timeTotal;
        this.timeUsr = timeUsr;
        this.timeSys = timeSys;
        this.timeUsrWorker = timeUsrWorker;
        this.timeSysWorker = timeSysWorker;
        this.memRss = memRss;
        this.memRssWorker = memRssWorker;
        this.errors = errors;
    }

    recordMemory({ rss = 0, vtotal, heapTotal, heapUsed }) {
        this.memRss = Math.max(this.memRss, rss);
    }

    recordCpu({ user, system }) {
        this.timeUsr = Math.max(this.timeUsr, user);
        this.timeSys = Math.max(this.timeSys, system);
    }

    recordWorkerMemory({ rss = 0, vtotal, heapTotal, heapUsed }) {
        this.memRssWorker = Math.max(this.memRssWorker, rss);
    }

    recordWorkerCpu({ user, system }) {
        this.timeUsrWorker = Math.max(this.timeUsrWorker, user);
        this.timeSysWorker = Math.max(this.timeSysWorker, system);
    }

    probeMemoryUsage({ interval = 100 } = {}) {
        const probe = () => {
            this.recordMemory(process.memoryUsage());
            _timer.set(this, setTimeout(probe, interval));
        };

        probe();
    }

    markTestStart() {
        _startTime.set(this, Date.now());
    }

    markTestEnd() {
        this.timeTotal = Date.now() - _startTime.get(this);
    }

    markError() {
        this.errors++;
    }

    stopProbingMemoryUsage() {
        clearTimeout(_timer.get(this));
    }

    static timeout(name) {
        return new BenchmarkResult({ name, timeout: true });
    }
}

module.exports = BenchmarkResult;