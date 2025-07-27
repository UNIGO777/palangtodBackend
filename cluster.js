const cluster = require('cluster');
const os = require('os');
const path = require('path');

// Get the number of CPU cores
const numCPUs = os.cpus().length;

// Determine how many workers to start
// Use 75% of available cores, minimum 1, maximum 8
const workerCount = Math.min(Math.max(1, Math.floor(numCPUs * 0.75)), 8);

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);
  console.log(`Starting ${workerCount} workers on ${numCPUs} available CPU cores`);

  // Fork workers
  for (let i = 0; i < workerCount; i++) {
    cluster.fork();
  }

  // Listen for dying workers
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
    // Replace the dead worker
    console.log('Forking a new worker...');
    cluster.fork();
  });
  
  // Log when a worker comes online
  cluster.on('online', (worker) => {
    console.log(`Worker ${worker.process.pid} is online`);
  });
} else {
  // Workers can share any TCP connection
  // In this case, it is an HTTP server
  require('./server');
} 