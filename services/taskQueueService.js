/**
 * Simple in-memory task queue for background processing
 */
class TaskQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = 3; // Maximum number of concurrent tasks
    this.activeTasks = 0;
  }

  /**
   * Add a task to the queue
   * @param {Function} taskFn - The function to execute
   * @param {string} taskName - Name for logging purposes
   * @param {Object} options - Options for the task
   * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
   * @param {number} [options.retryDelay=5000] - Delay between retries in ms
   * @param {any[]} args - Arguments to pass to the function
   * @returns {Promise} A promise that resolves when the task is added to the queue
   */
  async addTask(taskFn, taskName, ...args) {
    // Check if last arg is options object
    let options = { maxRetries: 3, retryDelay: 5000 };
    if (args.length > 0 && typeof args[args.length-1] === 'object' && args[args.length-1]._isTaskOptions) {
      options = args.pop();
    }
    
    return new Promise((resolve) => {
      const task = {
        id: Date.now() + Math.random().toString(36).substring(7),
        taskFn,
        taskName,
        args,
        addedAt: new Date(),
        resolve,
        retries: 0,
        maxRetries: options.maxRetries || 3,
        retryDelay: options.retryDelay || 5000
      };

      this.queue.push(task);
      console.log(`[TaskQueue] Task ${task.id} (${taskName}) added to queue. Queue length: ${this.queue.length}`);
      
      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  /**
   * Create task options object
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} retryDelay - Delay between retries in ms
   * @returns {Object} Task options
   */
  createTaskOptions(maxRetries = 3, retryDelay = 5000) {
    return {
      _isTaskOptions: true,
      maxRetries,
      retryDelay
    };
  }

  /**
   * Process the queue
   */
  async processQueue() {
    if (this.queue.length === 0 || this.activeTasks >= this.maxConcurrent) {
      return;
    }

    this.processing = true;
    this.activeTasks++;

    const task = this.queue.shift();
    console.log(`[TaskQueue] Processing task ${task.id} (${task.taskName}). Remaining: ${this.queue.length}`);

    try {
      const startTime = Date.now();
      const result = await task.taskFn(...task.args);
      const duration = Date.now() - startTime;
      
      console.log(`[TaskQueue] Task ${task.id} (${task.taskName}) completed in ${duration}ms`);
      task.resolve(result);
    } catch (error) {
      console.error(`[TaskQueue] Task ${task.id} (${task.taskName}) failed:`, error);
      
      // Handle retries
      if (task.retries < task.maxRetries) {
        task.retries++;
        console.log(`[TaskQueue] Retrying task ${task.id} (${task.taskName}), attempt ${task.retries}/${task.maxRetries} in ${task.retryDelay}ms`);
        
        // Add back to queue with delay
        setTimeout(() => {
          this.queue.push(task);
          
          // If we weren't processing, restart
          if (!this.processing) {
            this.processQueue();
          }
        }, task.retryDelay);
      } else {
        console.error(`[TaskQueue] Task ${task.id} (${task.taskName}) failed after ${task.retries} retries`);
        task.resolve({ error: error.message, retries: task.retries, failed: true });
      }
    } finally {
      this.activeTasks--;
      
      // Process next task if any
      if (this.queue.length > 0) {
        this.processQueue();
      } else if (this.activeTasks === 0) {
        this.processing = false;
      }

      // If we have capacity for more concurrent tasks, start another
      if (this.activeTasks < this.maxConcurrent && this.queue.length > 0) {
        this.processQueue();
      }
    }
  }

  /**
   * Get the current queue status
   * @returns {Object} Queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeTasks: this.activeTasks,
      isProcessing: this.processing,
    };
  }
}

// Create a singleton instance
const taskQueue = new TaskQueue();

module.exports = taskQueue; 