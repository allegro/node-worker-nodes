[![view on npm](https://img.shields.io/npm/v/worker-nodes.svg)](https://www.npmjs.org/package/worker-nodes)
[![Build Status](https://travis-ci.org/allegro/node-worker-nodes.svg?branch=master)](https://travis-ci.org/allegro/node-worker-nodes)

# worker-nodes

  A node.js library to run cpu-intensive tasks in a separate processes and to not to block the event loop.


## Installation

```bash
$ npm install worker-nodes
```

  Node.js greater than 11.7.0 is *required*

# API Reference

<a name="WorkerNodes"></a>

## WorkerNodes
**Kind**: global class  

* [WorkerNodes](#WorkerNodes)
    * [new WorkerNodes(path, [options])](#new_WorkerNodes_new)
    * [.call](#WorkerNodes+call) : <code>Proxy</code>
    * [.ready()](#WorkerNodes+ready) ⇒ <code>Promise</code>
    * [.terminate()](#WorkerNodes+terminate) ⇒ <code>Promise</code>
    * [.profiler(duration)](#WorkerNodes+profiler) ⇒ <code>void</code>
    * [.takeSnapshot()](#WorkerNodes+takeSnapshot) ⇒ <code>void</code>
    * [.getUsedWorkers()](#WorkerNodes+getUsedWorkers) ⇒ <code>Array.&lt;Worker&gt;</code>

<a name="new_WorkerNodes_new"></a>

### new WorkerNodes(path, [options])

| Param | Type | Description |
| --- | --- | --- |
| path | <code>String</code> | An absolute path to the module that will be run in the workers. |
| [options] | <code>Object</code> | See [WorkerNodesOptions](#WorkerNodesOptions) for a detailed description. |

<a name="WorkerNodes+call"></a>

### workerNodes.call : <code>Proxy</code>
This exposes the api of a module that the worker nodes are working on. If the module is a function, you
can call this directly. If the module exports multiple functions, you can call them as they were properties
of this proxy.

**Kind**: instance property of [<code>WorkerNodes</code>](#WorkerNodes)  
<a name="WorkerNodes+ready"></a>

### workerNodes.ready() ⇒ <code>Promise</code>
A method to check if the minimum required number of workers are ready to serve the calls.

**Kind**: instance method of [<code>WorkerNodes</code>](#WorkerNodes)  
**Returns**: <code>Promise</code> - resolves with a [WorkerNodes](#WorkerNodes) instance  
<a name="WorkerNodes+terminate"></a>

### workerNodes.terminate() ⇒ <code>Promise</code>
Starts the process of terminating this instance.

**Kind**: instance method of [<code>WorkerNodes</code>](#WorkerNodes)  
**Returns**: <code>Promise</code> - - resolved when the instance is terminated.  
<a name="WorkerNodes+profiler"></a>

### workerNodes.profiler(duration) ⇒ <code>void</code>
Run CPU Profiler and save result on main process directory

**Kind**: instance method of [<code>WorkerNodes</code>](#WorkerNodes)  

| Param | Type |
| --- | --- |
| duration | <code>number</code> | 

<a name="WorkerNodes+takeSnapshot"></a>

### workerNodes.takeSnapshot() ⇒ <code>void</code>
Take Heap Snapshot and save result on main process directory

**Kind**: instance method of [<code>WorkerNodes</code>](#WorkerNodes)  
<a name="WorkerNodes+getUsedWorkers"></a>

### workerNodes.getUsedWorkers() ⇒ <code>Array.&lt;Worker&gt;</code>
Return list with used workers in pool

**Kind**: instance method of [<code>WorkerNodes</code>](#WorkerNodes)  

<a name="WorkerNodesOptions"></a>

## WorkerNodesOptions
Describes a WorkerNodes options.

**Kind**: global class  

* [WorkerNodesOptions](#WorkerNodesOptions)
    * [.autoStart](#WorkerNodesOptions+autoStart) : <code>Boolean</code>
    * [.lazyStart](#WorkerNodesOptions+lazyStart) : <code>Boolean</code>
    * [.minWorkers](#WorkerNodesOptions+minWorkers) : <code>Number</code>
    * [.maxWorkers](#WorkerNodesOptions+maxWorkers) : <code>Number</code>
    * [.maxTasks](#WorkerNodesOptions+maxTasks) : <code>Number</code>
    * [.maxTasksPerWorker](#WorkerNodesOptions+maxTasksPerWorker) : <code>Number</code>
    * [.taskTimeout](#WorkerNodesOptions+taskTimeout) : <code>Number</code>
    * [.taskMaxRetries](#WorkerNodesOptions+taskMaxRetries) : <code>Number</code>
    * [.workerEndurance](#WorkerNodesOptions+workerEndurance) : <code>Number</code>
    * [.workerStopTimeout](#WorkerNodesOptions+workerStopTimeout) : <code>Number</code>

<a name="WorkerNodesOptions+autoStart"></a>

### options.autoStart : <code>Boolean</code>
Whether should initialize the workers before a first call.

If true, depending on the [lazyStart](#WorkerNodesOptions+lazyStart) option, it will start the
[min](#WorkerNodesOptions+minWorkers) or [max](#WorkerNodesOptions+maxWorkers) number of workers.

**Kind**: instance property of [<code>WorkerNodesOptions</code>](#WorkerNodesOptions)  
**Default**: <code>false</code>  
<a name="WorkerNodesOptions+lazyStart"></a>

### options.lazyStart : <code>Boolean</code>
Whether should start a new worker only if all the others are busy.

**Kind**: instance property of [<code>WorkerNodesOptions</code>](#WorkerNodesOptions)  
**Default**: <code>false</code>  
<a name="WorkerNodesOptions+minWorkers"></a>

### options.minWorkers : <code>Number</code>
The minimum number of workers that needs to be running to consider the whole pool as operational.

**Kind**: instance property of [<code>WorkerNodesOptions</code>](#WorkerNodesOptions)  
**Default**: <code>0</code>  
<a name="WorkerNodesOptions+maxWorkers"></a>

### options.maxWorkers : <code>Number</code>
The maximum number of workers that can be running at the same time.
Defaults to the number of cores the operating system sees.

**Kind**: instance property of [<code>WorkerNodesOptions</code>](#WorkerNodesOptions)  
<a name="WorkerNodesOptions+maxTasks"></a>

### options.maxTasks : <code>Number</code>
The maximum number of calls that can be handled at the same time.
Exceeding this limit causes MaxConcurrentCallsError to be thrown.

**Kind**: instance property of [<code>WorkerNodesOptions</code>](#WorkerNodesOptions)  
**Default**: <code>Infinity</code>  
<a name="WorkerNodesOptions+maxTasksPerWorker"></a>

### options.maxTasksPerWorker : <code>Number</code>
The number of calls that can be given to a single worker at the same time.

**Kind**: instance property of [<code>WorkerNodesOptions</code>](#WorkerNodesOptions)  
**Default**: <code>1</code>  
<a name="WorkerNodesOptions+taskTimeout"></a>

### options.taskTimeout : <code>Number</code>
The number milliseconds after which a call is considered to be lost.
Exceeding this limit causes TimeoutError to be thrown and a worker that performed that task to be killed.

**Kind**: instance property of [<code>WorkerNodesOptions</code>](#WorkerNodesOptions)  
**Default**: <code>Infinity</code>  
<a name="WorkerNodesOptions+taskMaxRetries"></a>

### options.taskMaxRetries : <code>Number</code>
The maximum number of retries that will be performed over a task before reporting it as incorrectly terminated.
Exceeding this limit causes ProcessTerminatedError to be thrown.

**Kind**: instance property of [<code>WorkerNodesOptions</code>](#WorkerNodesOptions)  
**Default**: <code>0</code>  
<a name="WorkerNodesOptions+workerEndurance"></a>

### options.workerEndurance : <code>Number</code>
The maximum number of calls that a single worker can handle during its whole lifespan.
Exceeding this limit causes the termination of the worker.

**Kind**: instance property of [<code>WorkerNodesOptions</code>](#WorkerNodesOptions)  
**Default**: <code>Infinity</code>  
<a name="WorkerNodesOptions+workerStopTimeout"></a>

### options.workerStopTimeout : <code>Number</code>
The timeout value (in milliseconds) for the worker to stop before sending SIGKILL.

**Kind**: instance property of [<code>WorkerNodesOptions</code>](#WorkerNodesOptions)  
**Default**: <code>100</code>  

## Example

Given `/home/joe.doe/workspace/my-module.js`:
```javascript
module.exports = function myTask() {
    return 'hello from separate process!';
};
```

you can run it through the worker nodes as follows:
```javascript
const WorkerNodes = require('worker-nodes');
const myModuleWorkerNodes = new WorkerNodes('/home/joe.doe/workspace/my-module');

myModuleWorkerNodes.call().then(msg => console.log(msg));  // -> 'hello from separate process!'
```

For more advanced examples please refer to [the test cases](https://github.com/allegro/node-worker-nodes/blob/master/tests/e2e.spec.js).


## Running tests

Check out the library code and then:

```bash
$ npm install
$ npm test
```

## Benchmarks

To run tests, type:

```bash
$ npm install
$ npm run benchmark
```

It will run a performance test against the selected libraries:
- data in: an object that consists of a single field that is a 0.5MB random string
- data out: received object stringified and concatenated with another 1MB string

Example results:
```bash
results for 100 executions

name                time: total [ms]  time usr [ms]  time sys [ms]  worker usr [ms]  worker sys [ms]  mem rss [MB]  worker rss [MB]  errors
------------------  ----------------  -------------  -------------  ---------------  ---------------  ------------  ---------------  ------
no-workers                       148            203             37                0                0            98                0       0
worker-nodes@2.0.0               362            390            143              389              143           213              210       0
workerpool@6.0.0                 367            495            185              492              182           236              245       0
worker-nodes@1.6.1              1095            520            207              592              243           216               86       0
worker-farm@1.7.0               1886            749            276              947              299           221               70       0
process-pool@0.3.5              2002            847            285              986              309           219               74       0
worker-pool@3.0.2              13775           7129           5236             1891              952           363               63       0

  os : Darwin / 19.5.0 / x64
 cpu : Intel(R) Core(TM) i7-7660U CPU @ 2.50GHz × 4
node : 14.3.0 / v8: 8.1.307.31-node.33
```

## See also

sources of inspiration:
* [Worker Farm](https://github.com/rvagg/node-worker-farm)
* [workerpool](https://github.com/josdejong/workerpool)
* [process-pool](https://github.com/ohjames/process-pool)
* [node-worker-pool](https://github.com/jeffmo/node-worker-pool)

## License

Copyright Allegro Sp. z o.o.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.