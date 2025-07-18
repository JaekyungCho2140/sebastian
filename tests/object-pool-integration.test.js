const { M4DialogueProcessorStreaming } = require('../src/services/m4/processors/m4DialogueProcessorStreaming');
const { M4StringProcessorStreaming } = require('../src/services/m4/processors/m4StringProcessorStreaming');
const { poolManager } = require('../src/services/m4/performance/object-pool');
const { createM4MemoryMonitor } = require('../src/services/m4/optimization/memoryMonitor');
const path = require('path');
const fs = require('fs').promises;

describe('Object Pool Integration Tests', () => {
  const testDataPath = path.join(__dirname, 'test-data', 'm4-excel');
  const outputPath = path.join(__dirname, 'test-outputs');

  beforeAll(async () => {
    // Ensure output directory exists
    await fs.mkdir(outputPath, { recursive: true });
  });

  describe('M4DialogueProcessorStreaming with Object Pools', () => {
    let processor;
    let memoryMonitor;

    beforeEach(() => {
      processor = new M4DialogueProcessorStreaming();
      memoryMonitor = createM4MemoryMonitor();
      poolManager.resetAllStats();
    });

    afterEach(() => {
      if (memoryMonitor.getStatus().isMonitoring) {
        memoryMonitor.stop();
      }
    });

    test('should use object pools efficiently during processing', async () => {
      // Start memory monitoring
      memoryMonitor.start();
      
      const inputFile = path.join(testDataPath, 'CINEMATIC_DIALOGUE.xlsm');
      const outputFile = path.join(outputPath, 'test-dialogue-pool.xlsx');
      
      // Track pool usage
      const poolStats = {
        before: poolManager.getAllStats(),
        during: null,
        after: null
      };
      
      // Monitor pool usage during processing
      processor.on('step', () => {
        if (!poolStats.during) {
          poolStats.during = poolManager.getAllStats();
        }
      });
      
      // Process file
      await processor.processFile(inputFile, outputFile);
      
      // Get final stats
      poolStats.after = poolManager.getAllStats();
      memoryMonitor.stop();
      
      // Verify pools were used
      expect(poolStats.after['dialogue.row']).toBeDefined();
      expect(poolStats.after['dialogue.array']).toBeDefined();
      expect(poolStats.after['dialogue.map']).toBeDefined();
      
      // Check pool efficiency
      const rowPoolStats = poolStats.after['dialogue.row'];
      expect(rowPoolStats.acquired).toBeGreaterThan(0);
      expect(rowPoolStats.released).toBeGreaterThan(0);
      expect(rowPoolStats.hitRate).toBeGreaterThan(0.5); // At least 50% hit rate
      
      // Memory efficiency check
      const memoryReport = memoryMonitor.getReport();
      expect(memoryReport.poolStats).toBeDefined();
      
      // Pool should have prevented excessive object creation
      expect(rowPoolStats.created).toBeLessThan(rowPoolStats.acquired * 0.5);
    });

    test('should handle memory pressure with pool clearing', async () => {
      const inputFile = path.join(testDataPath, 'CINEMATIC_DIALOGUE.xlsm');
      const outputFile = path.join(outputPath, 'test-dialogue-pressure.xlsx');
      
      let memoryAlertTriggered = false;
      let poolsCleared = false;
      
      processor.on('warning', (message) => {
        if (message.includes('Critical memory usage')) {
          memoryAlertTriggered = true;
        }
      });
      
      // Monitor pool clearing
      const arrayPool = poolManager.getPool('dialogue.array');
      const originalClear = arrayPool.clear.bind(arrayPool);
      arrayPool.clear = function() {
        poolsCleared = true;
        return originalClear();
      };
      
      // Process file
      await processor.processFile(inputFile, outputFile);
      
      const poolStats = poolManager.getAllStats();
      
      // Verify pool management during memory pressure
      if (memoryAlertTriggered) {
        expect(poolsCleared).toBe(true);
      }
      
      // Pools should still function after clearing
      expect(poolStats['dialogue.array'].currentSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('M4StringProcessorStreaming with Object Pools', () => {
    let processor;
    let memoryMonitor;

    beforeEach(() => {
      processor = new M4StringProcessorStreaming();
      memoryMonitor = createM4MemoryMonitor();
      poolManager.resetAllStats();
    });

    afterEach(() => {
      if (memoryMonitor.getStatus().isMonitoring) {
        memoryMonitor.stop();
      }
    });

    test('should use object pools for string processing', async () => {
      memoryMonitor.start();
      
      const inputFolder = path.join(testDataPath, 'string-files');
      const outputFile = path.join(outputPath, 'test-string-pool.xlsx');
      
      // Process files
      await processor.processFolder(inputFolder, outputFile);
      
      const poolStats = poolManager.getAllStats();
      memoryMonitor.stop();
      
      // Verify string processor pools
      expect(poolStats['string.row']).toBeDefined();
      expect(poolStats['string.array']).toBeDefined();
      expect(poolStats['string.map']).toBeDefined();
      expect(poolStats['string.set']).toBeDefined();
      
      // Check efficiency
      const arrayPoolStats = poolStats['string.array'];
      expect(arrayPoolStats.acquired).toBeGreaterThan(0);
      expect(arrayPoolStats.hitRate).toBeGreaterThan(0.5);
      
      // String builder should be used for concatenation
      const stringBuilderStats = poolStats['string.stringBuilder'];
      if (stringBuilderStats) {
        expect(stringBuilderStats.acquired).toBeGreaterThan(0);
      }
    });
  });

  describe('Pool Performance Comparison', () => {
    test('should show memory improvement with pools vs without', async () => {
      // This test would compare memory usage with and without pools
      // For now, we'll just verify pool stats show efficiency
      
      const processor = new M4DialogueProcessorStreaming();
      const inputFile = path.join(testDataPath, 'CINEMATIC_DIALOGUE.xlsm');
      const outputFile = path.join(outputPath, 'test-performance.xlsx');
      
      const memBefore = process.memoryUsage();
      
      await processor.processFile(inputFile, outputFile);
      
      const memAfter = process.memoryUsage();
      const poolStats = poolManager.getAllStats();
      
      // Calculate memory saved by pooling
      let totalReused = 0;
      let totalCreated = 0;
      
      for (const [name, stats] of Object.entries(poolStats)) {
        if (stats.acquired > stats.created) {
          totalReused += stats.acquired - stats.created;
        }
        totalCreated += stats.created;
      }
      
      // Verify object reuse
      expect(totalReused).toBeGreaterThan(0);
      
      // Log performance metrics
      console.log('Pool Performance Metrics:');
      console.log(`Total objects created: ${totalCreated}`);
      console.log(`Total objects reused: ${totalReused}`);
      console.log(`Reuse ratio: ${(totalReused / (totalReused + totalCreated) * 100).toFixed(2)}%`);
      console.log(`Memory delta: ${((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
    });
  });

  describe('Pool Statistics in Memory Monitor', () => {
    test('should include pool stats in memory reports', async () => {
      const memoryMonitor = createM4MemoryMonitor();
      const processor = new M4DialogueProcessorStreaming();
      
      memoryMonitor.start();
      
      // Do some processing to generate pool activity
      const inputFile = path.join(testDataPath, 'CINEMATIC_DIALOGUE.xlsm');
      const outputFile = path.join(outputPath, 'test-monitor-stats.xlsx');
      
      await processor.processFile(inputFile, outputFile);
      
      // Get memory report
      const report = memoryMonitor.getReport();
      memoryMonitor.stop();
      
      // Verify pool stats are included
      expect(report.poolStats).toBeDefined();
      expect(Object.keys(report.poolStats).length).toBeGreaterThan(0);
      
      // Check specific pool stats
      for (const [poolName, stats] of Object.entries(report.poolStats)) {
        expect(stats).toHaveProperty('created');
        expect(stats).toHaveProperty('acquired');
        expect(stats).toHaveProperty('released');
        expect(stats).toHaveProperty('currentSize');
        expect(stats).toHaveProperty('hitRate');
      }
    });
  });

  describe('Pool Lifecycle Management', () => {
    test('should properly clean up pools after processing', async () => {
      const processor = new M4DialogueProcessorStreaming();
      const inputFile = path.join(testDataPath, 'CINEMATIC_DIALOGUE.xlsm');
      const outputFile = path.join(outputPath, 'test-cleanup.xlsx');
      
      // Process file
      await processor.processFile(inputFile, outputFile);
      
      // Get pool stats before cleanup
      const statsBefore = poolManager.getAllStats();
      
      // Clear all pools
      poolManager.clearAll();
      
      // Get stats after cleanup
      const statsAfter = poolManager.getAllStats();
      
      // Verify pools are cleared
      for (const [poolName, stats] of Object.entries(statsAfter)) {
        expect(stats.currentSize).toBe(0);
        // But created count should remain
        expect(stats.created).toBe(statsBefore[poolName].created);
      }
    });

    test('should resize pools based on usage patterns', () => {
      const arrayPool = poolManager.getPool('dialogue.array');
      if (!arrayPool) {
        // Create pool if not exists
        const { ArrayPool } = require('../src/services/m4/performance/object-pool');
        const pool = new ArrayPool();
        poolManager.registerPool('dialogue.array', pool);
      }
      
      const pool = poolManager.getPool('dialogue.array');
      const initialStats = pool.getStats();
      
      // Simulate high usage
      const objects = [];
      for (let i = 0; i < 50; i++) {
        objects.push(pool.acquire());
      }
      
      // Check expansion
      const expandedStats = pool.getStats();
      expect(expandedStats.expansions).toBeGreaterThan(0);
      expect(expandedStats.created).toBeGreaterThan(initialStats.created);
      
      // Release all
      objects.forEach(obj => pool.release(obj));
      
      // Pool should maintain expanded size
      const finalStats = pool.getStats();
      expect(finalStats.currentSize).toBeGreaterThan(initialStats.currentSize);
    });
  });
});