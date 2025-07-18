import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Worker } from 'worker_threads';
import { WorkerThreadPool } from '../../src/services/m4/workers/workerThreadPool';
import { WorkerMessage, WorkerMessageType } from '../../src/types/worker-types';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';

const TEST_OUTPUT_DIR = join(__dirname, '../test-outputs', 'worker-tests');

describe('Worker Thread Communication', () => {
  let workerPool: WorkerThreadPool;

  beforeEach(() => {
    if (!existsSync(TEST_OUTPUT_DIR)) {
      mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  afterEach(async () => {
    if (workerPool) {
      await workerPool.terminate();
    }
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  describe('Worker Thread Pool', () => {
    it('should create and initialize worker pool', async () => {
      workerPool = new WorkerThreadPool({
        maxWorkers: 2,
        workerPath: join(__dirname, '../../src/workers/m4Worker.js'),
      });

      await workerPool.initialize();
      
      expect(workerPool.getPoolSize()).toBe(2);
      expect(workerPool.getActiveWorkerCount()).toBe(0);
    });

    it('should execute task on worker', async () => {
      workerPool = new WorkerThreadPool({
        maxWorkers: 1,
        workerPath: join(__dirname, '../../src/workers/m4Worker.js'),
      });

      await workerPool.initialize();

      const task = {
        type: 'PROCESS_EXCEL' as const,
        data: {
          filePath: join(TEST_OUTPUT_DIR, 'test.xlsx'),
          options: {},
        },
      };

      const result = await workerPool.executeTask(task);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle worker errors gracefully', async () => {
      workerPool = new WorkerThreadPool({
        maxWorkers: 1,
        workerPath: join(__dirname, '../../src/workers/m4Worker.js'),
      });

      await workerPool.initialize();

      const invalidTask = {
        type: 'INVALID_TASK' as any,
        data: {},
      };

      await expect(workerPool.executeTask(invalidTask))
        .rejects.toThrow();
    });

    it('should distribute tasks across multiple workers', async () => {
      workerPool = new WorkerThreadPool({
        maxWorkers: 3,
        workerPath: join(__dirname, '../../src/workers/m4Worker.js'),
      });

      await workerPool.initialize();

      const tasks = Array.from({ length: 6 }, (_, i) => ({
        type: 'PROCESS_EXCEL' as const,
        data: {
          filePath: join(TEST_OUTPUT_DIR, `test${i}.xlsx`),
          options: {},
        },
      }));

      const results = await Promise.all(
        tasks.map(task => workerPool.executeTask(task))
      );

      expect(results).toHaveLength(6);
      expect(workerPool.getActiveWorkerCount()).toBeLessThanOrEqual(3);
    });

    it('should handle worker termination and restart', async () => {
      workerPool = new WorkerThreadPool({
        maxWorkers: 1,
        workerPath: join(__dirname, '../../src/workers/m4Worker.js'),
        restartOnError: true,
      });

      await workerPool.initialize();

      // Force worker to error
      const errorTask = {
        type: 'FORCE_ERROR' as any,
        data: {},
      };

      try {
        await workerPool.executeTask(errorTask);
      } catch (error) {
        // Expected error
      }

      // Worker should be restarted, pool should still be functional
      const validTask = {
        type: 'PROCESS_EXCEL' as const,
        data: {
          filePath: join(TEST_OUTPUT_DIR, 'test.xlsx'),
          options: {},
        },
      };

      const result = await workerPool.executeTask(validTask);
      expect(result).toBeDefined();
    });
  });

  describe('Worker Message Handling', () => {
    it('should handle progress messages', async () => {
      const progressCallback = vi.fn();
      
      workerPool = new WorkerThreadPool({
        maxWorkers: 1,
        workerPath: join(__dirname, '../../src/workers/m4Worker.js'),
        onProgress: progressCallback,
      });

      await workerPool.initialize();

      const task = {
        type: 'PROCESS_WITH_PROGRESS' as any,
        data: {
          steps: 5,
        },
      };

      await workerPool.executeTask(task);

      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          percentage: expect.any(Number),
          message: expect.any(String),
        })
      );
    });

    it('should handle log messages', async () => {
      const logCallback = vi.fn();
      
      workerPool = new WorkerThreadPool({
        maxWorkers: 1,
        workerPath: join(__dirname, '../../src/workers/m4Worker.js'),
        onLog: logCallback,
      });

      await workerPool.initialize();

      const task = {
        type: 'PROCESS_WITH_LOGS' as any,
        data: {},
      };

      await workerPool.executeTask(task);

      expect(logCallback).toHaveBeenCalled();
      expect(logCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          level: expect.any(String),
          message: expect.any(String),
          timestamp: expect.any(Number),
        })
      );
    });

    it('should handle memory usage reporting', async () => {
      const memoryCallback = vi.fn();
      
      workerPool = new WorkerThreadPool({
        maxWorkers: 1,
        workerPath: join(__dirname, '../../src/workers/m4Worker.js'),
        onMemoryUsage: memoryCallback,
      });

      await workerPool.initialize();

      const task = {
        type: 'MEMORY_INTENSIVE_TASK' as any,
        data: {
          size: 1024 * 1024, // 1MB
        },
      };

      await workerPool.executeTask(task);

      expect(memoryCallback).toHaveBeenCalled();
      expect(memoryCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          heapUsed: expect.any(Number),
          heapTotal: expect.any(Number),
          external: expect.any(Number),
          arrayBuffers: expect.any(Number),
        })
      );
    });
  });

  describe('Worker Performance', () => {
    it('should process tasks concurrently', async () => {
      workerPool = new WorkerThreadPool({
        maxWorkers: 4,
        workerPath: join(__dirname, '../../src/workers/m4Worker.js'),
      });

      await workerPool.initialize();

      const startTime = Date.now();
      
      // Each task takes ~100ms
      const tasks = Array.from({ length: 8 }, () => ({
        type: 'DELAY_TASK' as any,
        data: { delay: 100 },
      }));

      await Promise.all(
        tasks.map(task => workerPool.executeTask(task))
      );

      const totalTime = Date.now() - startTime;
      
      // With 4 workers, 8 tasks of 100ms each should take ~200ms
      expect(totalTime).toBeLessThan(300);
      expect(totalTime).toBeGreaterThan(150);
    });

    it('should queue tasks when all workers are busy', async () => {
      workerPool = new WorkerThreadPool({
        maxWorkers: 2,
        workerPath: join(__dirname, '../../src/workers/m4Worker.js'),
      });

      await workerPool.initialize();

      const taskStarted = vi.fn();
      const taskCompleted = vi.fn();

      const tasks = Array.from({ length: 5 }, (_, i) => ({
        type: 'TRACKED_TASK' as any,
        data: {
          id: i,
          delay: 50,
          onStart: taskStarted,
          onComplete: taskCompleted,
        },
      }));

      await Promise.all(
        tasks.map(task => workerPool.executeTask(task))
      );

      expect(taskStarted).toHaveBeenCalledTimes(5);
      expect(taskCompleted).toHaveBeenCalledTimes(5);
      
      // Verify that no more than 2 tasks ran simultaneously
      expect(workerPool.getMaxConcurrentTasks()).toBe(2);
    });

    it('should handle memory pressure', async () => {
      workerPool = new WorkerThreadPool({
        maxWorkers: 2,
        workerPath: join(__dirname, '../../src/workers/m4Worker.js'),
        maxMemoryPerWorker: 100 * 1024 * 1024, // 100MB
      });

      await workerPool.initialize();

      const memoryIntensiveTasks = Array.from({ length: 4 }, () => ({
        type: 'ALLOCATE_MEMORY' as any,
        data: {
          size: 50 * 1024 * 1024, // 50MB each
        },
      }));

      // Should handle memory pressure without crashing
      const results = await Promise.all(
        memoryIntensiveTasks.map(task => 
          workerPool.executeTask(task).catch(err => ({ error: err.message }))
        )
      );

      // Some tasks might fail due to memory limits
      const successfulTasks = results.filter(r => !r.error);
      expect(successfulTasks.length).toBeGreaterThan(0);
    });
  });

  describe('Worker Thread Direct Communication', () => {
    let worker: Worker;

    afterEach(() => {
      if (worker) {
        worker.terminate();
      }
    });

    it('should send and receive messages', async () => {
      worker = new Worker(join(__dirname, '../../src/workers/m4Worker.js'));

      const responsePromise = new Promise((resolve) => {
        worker.once('message', resolve);
      });

      const message: WorkerMessage = {
        type: WorkerMessageType.TASK,
        id: 'test-1',
        data: {
          type: 'ECHO',
          data: { message: 'Hello Worker' },
        },
      };

      worker.postMessage(message);

      const response = await responsePromise;
      expect(response).toMatchObject({
        type: WorkerMessageType.RESULT,
        id: 'test-1',
        data: { message: 'Hello Worker' },
      });
    });

    it('should handle SharedArrayBuffer communication', async () => {
      // Skip if SharedArrayBuffer is not available
      if (typeof SharedArrayBuffer === 'undefined') {
        return;
      }

      worker = new Worker(join(__dirname, '../../src/workers/m4Worker.js'));

      const sharedBuffer = new SharedArrayBuffer(1024);
      const sharedArray = new Int32Array(sharedBuffer);
      sharedArray[0] = 42;

      const responsePromise = new Promise((resolve) => {
        worker.once('message', resolve);
      });

      worker.postMessage({
        type: WorkerMessageType.TASK,
        id: 'shared-1',
        data: {
          type: 'PROCESS_SHARED_BUFFER',
          sharedBuffer,
        },
      });

      const response = await responsePromise;
      expect(response.data.firstValue).toBe(42);
      expect(sharedArray[1]).toBe(84); // Worker should double the value
    });

    it('should handle message priorities', async () => {
      worker = new Worker(join(__dirname, '../../src/workers/m4Worker.js'));

      const results: string[] = [];
      const messageHandler = (msg: any) => {
        if (msg.type === WorkerMessageType.RESULT) {
          results.push(msg.data.priority);
        }
      };

      worker.on('message', messageHandler);

      // Send messages with different priorities
      const messages = [
        { priority: 'low', delay: 10 },
        { priority: 'urgent', delay: 10 },
        { priority: 'normal', delay: 10 },
        { priority: 'high', delay: 10 },
      ];

      messages.forEach((msg, i) => {
        worker.postMessage({
          type: WorkerMessageType.TASK,
          id: `priority-${i}`,
          priority: msg.priority,
          data: {
            type: 'PRIORITY_TASK',
            ...msg,
          },
        });
      });

      // Wait for all responses
      await new Promise(resolve => setTimeout(resolve, 100));

      // Urgent and high priority should be processed first
      expect(results[0]).toBe('urgent');
      expect(results[1]).toBe('high');

      worker.off('message', messageHandler);
    });
  });
});