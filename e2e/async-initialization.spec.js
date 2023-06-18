const test = require('ava');

const WorkerNodes = require('../');
const { fixture } = require('./utils');

for (const workerType of ["thread", "process"]) {
    test(`should not mark worker as ready until module fully initialized workerType: ${workerType}`, t => {
        // given
        const workerNodes = new WorkerNodes(fixture('async-initialization'), {
            maxWorkers: 1,
            asyncWorkerInitialization: true,
            autoStart: true,
            workerType
        });
    
        // then
        t.falsy(workerNodes.pickWorker());
    });
    
    test(`should correctly handle task after initialization workerType: ${workerType}`, async t => {
        // given
        const workerNodes = new WorkerNodes(fixture('async-initialization'), {
            maxWorkers: 1,
            asyncWorkerInitialization: true,
            autoStart: true,
            workerType
        });
    
        // when 
        const result = await workerNodes.call.result();
    
        // then
        t.is(result, 'result');
    });    
}
