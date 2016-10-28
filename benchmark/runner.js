const minimist = require('minimist');
const path = require('path');
const Promise = require('bluebird');

const BenchmarkResult = require('./lib/benchmark-result');

const inputData = require('fs').readFileSync(path.join(__dirname, 'fixtures/input.dat'), 'utf8');
const outputData = require('fs').readFileSync(path.join(__dirname, 'fixtures/output.dat'), 'utf8');
const expectedAnswerLength = (JSON.stringify({ data: inputData }) + outputData).length;

function singleTestAgainst(module) {
    return module.test(inputData);
}

function run({ what, times }) {
    return Promise.all(new Array(times).fill().map(() => what()));
}

function main() {
    const { module, repeats } = minimist(process.argv.slice(2));
    const moduleUnderTest = require(module);
    const result = new BenchmarkResult({
        name: path.basename(module) + (typeof moduleUnderTest.version !== 'function' ? '' : '@' + moduleUnderTest.version())
    });

    result.probeMemoryUsage({ interval: 100 });

    Promise.resolve()

        // warmup phase
        .then(() => run({
            what: singleTestAgainst.bind(null, moduleUnderTest),
            times: Math.min(5, repeats)
        }))

        .then(results => {
            results.forEach(({ html, stats }) => {
                result.recordWorkerMemory(stats);
                result.recordWorkerCpu(stats.cpu);
            });

            result.markTestStart();
        })

        // test phase
        .then(() => run({
            what: singleTestAgainst.bind(null, moduleUnderTest),
            times: repeats
        }))

        .then(results => {
            result.markTestEnd();

            results.forEach(({ html, stats }) => {
                if (html.length !== expectedAnswerLength) result.markError();
                result.recordWorkerMemory(stats);
                result.recordWorkerCpu(stats.cpu);
            });
        })

        // report
        .then(() => {
            result.recordMemory(process.memoryUsage());
            result.recordCpu(process.cpuUsage());

            process.send(result);
            process.exit(0);
        });
}

main();