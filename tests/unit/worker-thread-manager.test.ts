import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkerThreadManager } from '../../src/services/workerThreadManager';
import { WorkerType, WorkerPriority, WorkerState } from '../../src/types/workerTypes';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';

const TEST_OUTPUT_DIR = join(__dirname, '../test-outputs', 'worker-manager');

describe('WorkerThreadManager', () => {
  let manager: WorkerThreadManager;

  beforeEach(() => {
    if (!existsSync(TEST_OUTPUT_DIR)) {
      mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  afterEach(async () => {
    if (manager) {
      await manager.shutdown();
    }
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  describe('Worker Pool Management', () => {
    it('should initialize worker pool with default config', async () => {
      manager = new WorkerThreadManager();
      await manager.initialize();

      const stats = manager.getStatistics();
      expect(stats.poolSize).toBeGreaterThan(0);
      expect(stats.activeWorkers).toBe(0);
      expect(stats.idleWorkers).toBe(stats.poolSize);
    });

    it('should initialize worker pool with custom config', async () => {
      manager = new WorkerThreadManager({
        minWorkers: 2,
        maxWorkers: 4,
        enableMemoryManagement: true,
        memoryLimit: 512 * 1024 * 1024, // 512MB
      });
      await manager.initialize();

      const stats = manager.getStatistics();
      expect(stats.poolSize).toBeGreaterThanOrEqual(2);
      expect(stats.poolSize).toBeLessThanOrEqual(4);
    });

    it('should scale workers based on load', async () => {
      manager = new WorkerThreadManager({
        minWorkers: 1,
        maxWorkers: 4,
        autoScale: true,
      });
      await manager.initialize();

      // Create load by submitting multiple tasks
      const tasks = Array.from({ length: 10 }, (_, i) => 
        manager.executeTask({
          type: WorkerType.DIALOGUE,
          priority: WorkerPriority.NORMAL,
          config: {
            inputFolder: TEST_OUTPUT_DIR,
            outputFolder: TEST_OUTPUT_DIR,
            type: 'dialogue',
          },
          data: { taskId: i },
        })
      );

      // Check that pool scales up
      await new Promise(resolve => setTimeout(resolve, 100));
      const midStats = manager.getStatistics();
      expect(midStats.poolSize).toBeGreaterThan(1);

      // Wait for all tasks
      await Promise.allSettled(tasks);

      // Pool should scale down after idle time
      await new Promise(resolve => setTimeout(resolve, 2000));
      const finalStats = manager.getStatistics();
      expect(finalStats.poolSize).toBeLessThanOrEqual(midStats.poolSize);
    });
  });

  describe('Task Execution', () => {
    beforeEach(async () => {
      manager = new WorkerThreadManager();
      await manager.initialize();
    });

    it('should execute dialogue processing task', async () => {
      const result = await manager.executeTask({
        type: WorkerType.DIALOGUE,
        priority: WorkerPriority.NORMAL,
        config: {
          inputFolder: TEST_OUTPUT_DIR,
          outputFolder: TEST_OUTPUT_DIR,
          type: 'dialogue',
        },
        data: { test: true },
      });

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should execute string processing task', async () => {
      const result = await manager.executeTask({
        type: WorkerType.STRING,
        priority: WorkerPriority.NORMAL,
        config: {
          inputFolder: TEST_OUTPUT_DIR,
          outputFolder: TEST_OUTPUT_DIR,
          type: 'string',
        },
        data: { test: true },
      });

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle task priorities correctly', async () => {
      const results: number[] = [];
      
      // Submit tasks with different priorities
      const tasks = [
        { priority: WorkerPriority.LOW, id: 1 },
        { priority: WorkerPriority.URGENT, id: 2 },
        { priority: WorkerPriority.NORMAL, id: 3 },
        { priority: WorkerPriority.HIGH, id: 4 },
      ];

      const promises = tasks.map(task => 
        manager.executeTask({
          type: WorkerType.DIALOGUE,
          priority: task.priority,
          config: {
            inputFolder: TEST_OUTPUT_DIR,
            outputFolder: TEST_OUTPUT_DIR,
            type: 'dialogue',
          },
          data: { id: task.id },
        }).then(result => {
          results.push(task.id);
          return result;
        })
      );

      await Promise.all(promises);

      // Urgent and high priority tasks should be processed first
      const urgentIndex = results.indexOf(2);
      const highIndex = results.indexOf(4);
      const normalIndex = results.indexOf(3);
      const lowIndex = results.indexOf(1);

      expect(urgentIndex).toBeLessThan(lowIndex);
      expect(highIndex).toBeLessThan(lowIndex);
    });

    it('should handle task cancellation', async () => {
      const taskPromise = manager.executeTask({
        type: WorkerType.DIALOGUE,
        priority: WorkerPriority.NORMAL,
        config: {
          inputFolder: TEST_OUTPUT_DIR,
          outputFolder: TEST_OUTPUT_DIR,
          type: 'dialogue',
        },
        data: { delay: 1000 },
      });

      // Cancel after 100ms
      setTimeout(() => {
        manager.cancelTask(taskPromise);
      }, 100);

      await expect(taskPromise).rejects.toThrow(/cancelled/i);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      manager = new WorkerThreadManager();
      await manager.initialize();
    });

    it('should handle worker crashes and restart', async () => {
      const initialStats = manager.getStatistics();
      
      // Force a worker crash
      try {
        await manager.executeTask({
          type: WorkerType.DIALOGUE,
          priority: WorkerPriority.NORMAL,
          config: {
            inputFolder: TEST_OUTPUT_DIR,
            outputFolder: TEST_OUTPUT_DIR,
            type: 'dialogue',
          },
          data: { crash: true },
        });
      } catch (error) {
        // Expected error
      }

      // Wait for worker restart
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const afterStats = manager.getStatistics();
      expect(afterStats.totalErrors).toBeGreaterThan(initialStats.totalErrors);
      expect(afterStats.poolSize).toBe(initialStats.poolSize); // Worker should be restarted
    });

    it('should handle memory limit exceeded', async () => {
      manager = new WorkerThreadManager({
        memoryLimit: 50 * 1024 * 1024, // 50MB
        enableMemoryManagement: true,
      });
      await manager.initialize();

      await expect(
        manager.executeTask({
          type: WorkerType.DIALOGUE,
          priority: WorkerPriority.NORMAL,
          config: {
            inputFolder: TEST_OUTPUT_DIR,
            outputFolder: TEST_OUTPUT_DIR,
            type: 'dialogue',
          },
          data: { allocateMemory: 100 * 1024 * 1024 }, // 100MB
        })
      ).rejects.toThrow(/memory/i);
    });

    it('should handle timeout errors', async () => {
      manager = new WorkerThreadManager({
        taskTimeout: 1000, // 1 second
      });
      await manager.initialize();

      await expect(
        manager.executeTask({
          type: WorkerType.DIALOGUE,
          priority: WorkerPriority.NORMAL,
          config: {
            inputFolder: TEST_OUTPUT_DIR,
            outputFolder: TEST_OUTPUT_DIR,
            type: 'dialogue',
          },
          data: { delay: 2000 }, // 2 seconds
        })
      ).rejects.toThrow(/timeout/i);
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      manager = new WorkerThreadManager({
        enablePerformanceMonitoring: true,
      });
      await manager.initialize();
    });

    it('should track task performance metrics', async () => {
      await manager.executeTask({
        type: WorkerType.DIALOGUE,
        priority: WorkerPriority.NORMAL,
        config: {
          inputFolder: TEST_OUTPUT_DIR,
          outputFolder: TEST_OUTPUT_DIR,
          type: 'dialogue',
        },
        data: {},
      });

      const metrics = manager.getPerformanceMetrics();
      expect(metrics.totalTasks).toBe(1);
      expect(metrics.averageExecutionTime).toBeGreaterThan(0);
      expect(metrics.successRate).toBe(100);
    });

    it('should track memory usage', async () => {
      const memoryBefore = manager.getMemoryUsage();

      await manager.executeTask({
        type: WorkerType.DIALOGUE,
        priority: WorkerPriority.NORMAL,
        config: {
          inputFolder: TEST_OUTPUT_DIR,
          outputFolder: TEST_OUTPUT_DIR,
          type: 'dialogue',
        },
        data: { allocateMemory: 10 * 1024 * 1024 }, // 10MB
      });

      const memoryAfter = manager.getMemoryUsage();
      expect(memoryAfter.totalHeapUsed).toBeGreaterThan(memoryBefore.totalHeapUsed);
    });

    it('should emit performance events', async () => {
      const performanceEvents: any[] = [];
      
      manager.on('performance', (event) => {
        performanceEvents.push(event);
      });

      await manager.executeTask({
        type: WorkerType.DIALOGUE,
        priority: WorkerPriority.NORMAL,
        config: {
          inputFolder: TEST_OUTPUT_DIR,
          outputFolder: TEST_OUTPUT_DIR,
          type: 'dialogue',
        },
        data: {},
      });

      expect(performanceEvents.length).toBeGreaterThan(0);
      expect(performanceEvents.some(e => e.type === 'task_start')).toBe(true);
      expect(performanceEvents.some(e => e.type === 'task_complete')).toBe(true);
    });
  });

  describe('Worker Communication', () => {
    beforeEach(async () => {
      manager = new WorkerThreadManager();
      await manager.initialize();
    });

    it('should handle progress updates from workers', async () => {
      const progressUpdates: any[] = [];
      
      manager.on('progress', (progress) => {
        progressUpdates.push(progress);
      });

      await manager.executeTask({
        type: WorkerType.DIALOGUE,
        priority: WorkerPriority.NORMAL,
        config: {
          inputFolder: TEST_OUTPUT_DIR,
          outputFolder: TEST_OUTPUT_DIR,
          type: 'dialogue',
        },
        data: { reportProgress: true },
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
    });

    it('should handle log messages from workers', async () => {
      const logs: any[] = [];
      
      manager.on('log', (log) => {
        logs.push(log);
      });

      await manager.executeTask({
        type: WorkerType.DIALOGUE,
        priority: WorkerPriority.NORMAL,
        config: {
          inputFolder: TEST_OUTPUT_DIR,
          outputFolder: TEST_OUTPUT_DIR,
          type: 'dialogue',
        },
        data: { generateLogs: true },
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some(l => l.level === 'info')).toBe(true);
    });

    it('should handle worker state changes', async () => {
      const stateChanges: any[] = [];
      
      manager.on('workerStateChange', (state) => {
        stateChanges.push(state);
      });

      await manager.executeTask({
        type: WorkerType.DIALOGUE,
        priority: WorkerPriority.NORMAL,
        config: {
          inputFolder: TEST_OUTPUT_DIR,
          outputFolder: TEST_OUTPUT_DIR,
          type: 'dialogue',
        },
        data: {},
      });

      expect(stateChanges.some(s => s.state === WorkerState.BUSY)).toBe(true);
      expect(stateChanges.some(s => s.state === WorkerState.IDLE)).toBe(true);
    });
  });

  describe('Resource Management', () => {
    it('should prevent resource exhaustion', async () => {
      manager = new WorkerThreadManager({
        maxWorkers: 2,
        maxQueueSize: 5,
      });
      await manager.initialize();

      // Submit more tasks than queue can handle
      const tasks = Array.from({ length: 10 }, () => 
        manager.executeTask({
          type: WorkerType.DIALOGUE,
          priority: WorkerPriority.NORMAL,
          config: {
            inputFolder: TEST_OUTPUT_DIR,
            outputFolder: TEST_OUTPUT_DIR,
            type: 'dialogue',
          },
          data: { delay: 100 },
        })
      );

      const results = await Promise.allSettled(tasks);
      const rejected = results.filter(r => r.status === 'rejected');
      
      // Some tasks should be rejected due to queue limit
      expect(rejected.length).toBeGreaterThan(0);
    });

    it('should clean up resources on shutdown', async () => {
      manager = new WorkerThreadManager();
      await manager.initialize();

      const initialMemory = process.memoryUsage().heapUsed;

      // Create some tasks
      await Promise.all(
        Array.from({ length: 5 }, () => 
          manager.executeTask({
            type: WorkerType.DIALOGUE,
            priority: WorkerPriority.NORMAL,
            config: {
              inputFolder: TEST_OUTPUT_DIR,
              outputFolder: TEST_OUTPUT_DIR,
              type: 'dialogue',
            },
            data: {},
          })
        )
      );

      await manager.shutdown();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      
      // Memory should be released after shutdown
      expect(manager.getStatistics().poolSize).toBe(0);
    });
  });
});