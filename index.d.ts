interface Options {
  autoStart?: boolean;
  lazyStart?: boolean;
  minWorkers?: number;
  maxWorkers?: number;
  maxTasks?: number;
  maxTasksPerWorker?: number;
  taskTimeout?: number;
  taskMaxRetries?: number;
  workerEndurance?: number;
  workerStopTimeout?: number;
}

interface WorkerNodesInstance {
  call: CallProperty;
  ready: () => Promise<WorkerNodesInstance>;
  terminate: () => Promise<WorkerNodesInstance>;
}

interface CallProperty {
  (...args: any[]): Promise<any>;
  [method: string]: (...args: any[]) => Promise<any>;
}

interface WorkerNodes {
  new (name: string, options?: Options): WorkerNodesInstance;
}

declare module "worker-nodes" {
  const workerNodes: WorkerNodes;
  export = workerNodes;
}
