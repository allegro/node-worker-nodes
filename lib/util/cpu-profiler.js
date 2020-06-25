const inspector = require('inspector');
const fs = require('fs');

const DEFAULT_DURATION = 30000;

class Profiler {
    constructor() {
        this.session = new inspector.Session();
    }

    start(duration = DEFAULT_DURATION) {
        this.session.connect();

        this.session.post('Profiler.enable', () => {
            this.session.post('Profiler.start', () => {
                console.log(`start profiling server worker #${process.pid} for ${duration} ms`)
                setTimeout(() => this.stop(), duration);
            });
        });
    }

    stop() {
        this.session.post('Profiler.stop', (error, { profile }) => {
            if (error) throw new Error(error);
            const resultFileName = `./Profile-${process.pid}-${Date.now()}.cpuprofile`;

            fs.writeFile(resultFileName, JSON.stringify(profile), (error) => {
                if (error) throw new Error(error);

                console.log(`write profiler result to file - ${resultFileName}`)
                this.session.post('Profiler.disable');
                this.session.disconnect();
            });
        });
    }
}

module.exports = Profiler;