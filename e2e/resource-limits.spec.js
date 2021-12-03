const test = require('ava');

const WorkerNodes = require('../');
const { fixture } = require('./utils');

test('should set maxYoungGenerationSizeMb', async t => {
    // given
    const workerNodes = new WorkerNodes(fixture('process-info'), {
        autoStart: true,
        maxWorkers: 2,
        minWorkers: 2,
        resourceLimits: {
            maxYoungGenerationSizeMb: 20
        }
    });

    // when
    await workerNodes.ready();

    const workersList = workerNodes.getUsedWorkers();

    // then
    workersList.forEach(worker => {
        if (!worker.resourceLimits) {
            // resourceLimits is unsupported before node 12, skipping
            return t.true(true);
        }

        t.true(worker.resourceLimits.maxYoungGenerationSizeMb === 20)
    });
});

test('should set maxOldGenerationSizeMb', async t => {
    // given
    const workerNodes = new WorkerNodes(fixture('process-info'), {
        autoStart: true,
        maxWorkers: 2,
        minWorkers: 2,
        resourceLimits: {
            maxOldGenerationSizeMb: 300
        }
    });

    // when
    await workerNodes.ready();

    const workersList = workerNodes.getUsedWorkers();

    // then
    workersList.forEach(worker => {
        if (!worker.resourceLimits) {
            // resourceLimits is unsupported before node 12, skipping
            return t.true(true);
        }

        t.true(worker.resourceLimits.maxOldGenerationSizeMb === 300)
    });
});

test('should set codeRangeSizeMb', async t => {
    // given
    const workerNodes = new WorkerNodes(fixture('process-info'), {
        autoStart: true,
        maxWorkers: 2,
        minWorkers: 2,
        resourceLimits: {
            codeRangeSizeMb: 1
        }
    });

    // when
    await workerNodes.ready();

    const workersList = workerNodes.getUsedWorkers();

    // then
    workersList.forEach(worker => {
        if (!worker.resourceLimits) {
            // resourceLimits is unsupported before node 12, skipping
            return t.true(true);
        }

        t.true(worker.resourceLimits.codeRangeSizeMb === 1)
    });
});

test('should set stackSizeMb', async t => {
    // given
    const workerNodes = new WorkerNodes(fixture('process-info'), {
        autoStart: true,
        maxWorkers: 2,
        minWorkers: 2,
        resourceLimits: {
            stackSizeMb: 8
        }
    });

    // when
    await workerNodes.ready();

    const workersList = workerNodes.getUsedWorkers();

    // then
    workersList.forEach(worker => {
        if (!worker.resourceLimits) {
            // resourceLimits is unsupported before node 12, skipping
            return t.true(true);
        }

        t.true(worker.resourceLimits.stackSizeMb === 8)
    });
});
