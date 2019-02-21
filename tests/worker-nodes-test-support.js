const WorkerNodes = require('../');
const { fixture } = require('./utils');

const allocatedPools = [];

function givenWorkerPoolWith(script, options) {
  const pool = new WorkerNodes(fixture(script), options);
  allocatedPools.push(pool);
  return pool;
}

async function givenStartedWorkerPoolWith(script, options) {
  const pool = givenWorkerPoolWith(script, options);
  await pool.ready();
  return pool;
}

function shutdown() {
  while(allocatedPools.length){
    const pool = allocatedPools.pop();
    pool.terminate();
  }
}

module.exports = { givenWorkerPoolWith, givenStartedWorkerPoolWith, shutdown };