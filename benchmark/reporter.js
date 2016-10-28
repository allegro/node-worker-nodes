const childProcess = require('child_process');
const minimist = require('minimist');
const os = require('os');
const path = require('path');
const Promise = require('bluebird');
const Table = require('easy-table');

const BenchmarkResult = require('./lib/benchmark-result');

function printPlatform() {
    const sysInfo = (...keys) => keys.map(key => os[key]()).join(' / ');
    const cpuInfo = () => [os.cpus()[0].model, os.cpus().length].join(' × ');

    const infoTable = new Table();

    infoTable.cell('os', sysInfo('type', 'release', 'arch'));
    infoTable.cell('cpu', cpuInfo());
    infoTable.cell('node', process.versions.node + ' / v8: ' + process.versions.v8);
    infoTable.newRow();

    console.log(infoTable.printTransposed({ separator: ' : ', namePrinter: Table.leftPadder(' ') }));
}

function measure(filename, { repeats = 1 }) {
    const testProcess = childProcess.fork(require.resolve('./runner'), [
        '--repeats', repeats,
        '--module', filename
    ]);

    return new Promise((resolve, reject) => {
        testProcess.once('message', serializedResult => resolve(new BenchmarkResult(serializedResult)));
        testProcess.once('exit', reject);
    });
}

function prettyPrint(results) {
    const memoryFormatter = (val, width) => Table.padLeft((val / Math.pow(2, 20)).toFixed(0), width);
    const microTimeFormatter = (val, width) => Table.padLeft((val / 1e3).toFixed(0), width);

    results.sort((a, b) => a.timeTotal - b.timeTotal);
    console.log(Table.print(results, {
        name: {},
        timeTotal: { name: 'time: total [ms]', printer: Table.number(0) },
        timeUsr: { name: 'time usr [ms]', printer: microTimeFormatter },
        timeSys: { name: 'time sys [ms]', printer: microTimeFormatter },
        timeUsrWorker: { name: 'worker usr [ms]', printer: microTimeFormatter },
        timeSysWorker: { name: 'worker sys [ms]', printer: microTimeFormatter },
        memRss: { name: 'mem rss [MB]', printer: memoryFormatter },
        memRssWorker: { name: 'worker rss [MB]', printer: memoryFormatter },
        errors: { printer: Table.number(0) }
    }));
}

function main() {
    const runtimeArgs = minimist(process.argv.slice(2));
    const { repeats } = runtimeArgs;

    Promise.resolve(runtimeArgs._)

        .mapSeries((testName, i, length) => {
            console.log(`[${ i + 1 }/${ length }] processing: ${path.basename(testName)}`);
            return measure(testName, { repeats });
        })

        .then(results => {
            console.log(`\nresults for ${repeats} executions\n`);
            prettyPrint(results, { repeats });
            printPlatform();
        });
}

main();