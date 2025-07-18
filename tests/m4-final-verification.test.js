const { describe, it, beforeEach, afterEach, expect } = require('@jest/globals');
const path = require('path');
const fs = require('fs').promises;
const { EventEmitter } = require('events');
const os = require('os');
const v8 = require('v8');
const { Worker } = require('worker_threads');

// Mock 환경 설정
const IS_ELECTRON = process.env.NODE_ENV === 'test' && !process.versions.electron;

// Mock 모듈들
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => path.join(__dirname, 'test-outputs')),
    getName: jest.fn(() => 'Sebastian'),
    isPackaged: false
  },
  dialog: {
    showOpenDialog: jest.fn()
  },
  BrowserWindow: {
    getFocusedWindow: jest.fn(() => null)
  }
}));

// Performance 모듈들
const { MemoryMonitor } = require('../src/services/m4/performance/memory-monitor');
const { ObjectPoolManager } = require('../src/services/m4/performance/object-pool');
const { BatchProcessor } = require('../src/services/m4/performance/batch-processor');
const { PerformanceProfiler } = require('../src/services/m4/performance/profiler');

// M4 프로세서들
const { M4ProcessorFactory } = require('../src/services/m4/processors/processorFactory');
const { M4DialogueProcessorStreaming } = require('../src/services/m4/processors/m4DialogueProcessorStreaming');

// Worker Thread Manager
const { WorkerThreadManager } = require('../src/services/workerThreadManager');

// 테스트 유틸리티
const { createLargeTestFile, cleanupTestFiles, generateDialogueData } = require('./test-utils');

/**
 * Task 14.8: 최종 검증 및 메모리 누수 방지
 * 
 * 이 테스트 스위트는 다음을 검증합니다:
 * 1. 메모리 누수가 없음
 * 2. 스트레스 테스트 통과
 * 3. 리소스가 올바르게 정리됨
 * 4. 모든 최적화가 함께 작동함
 */
describe('Task 14.8 - Final Verification and Memory Leak Prevention', () => {
  let testDir;
  let memoryMonitor;
  let poolManager;
  let profiler;
  let workerManager;
  let testFiles = [];

  beforeEach(async () => {
    // 테스트 디렉토리 설정
    testDir = path.join(__dirname, 'test-outputs', `final-verification-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // 성능 모니터링 도구 초기화
    memoryMonitor = new MemoryMonitor({
      interval: 100,
      heapWarning: 300,
      heapCritical: 500
    });

    poolManager = new ObjectPoolManager();
    profiler = new PerformanceProfiler();
    workerManager = new WorkerThreadManager({ maxThreads: 2 });
  });

  afterEach(async () => {
    // 모든 리소스 정리
    memoryMonitor.stop();
    poolManager.clearAll();
    await workerManager.shutdown();

    // 테스트 파일 정리
    await cleanupTestFiles(testDir, testFiles);
    testFiles = [];

    // 강제 가비지 컬렉션
    if (global.gc) {
      global.gc();
    }
  });

  describe('Memory Leak Tests', () => {
    it('should not leak memory during continuous file processing', async () => {
      const iterations = 10;
      const fileSize = 10 * 1024 * 1024; // 10MB
      const memorySnapshots = [];
      
      // 메모리 모니터링 시작
      memoryMonitor.start();
      profiler.start('memory-leak-test');

      for (let i = 0; i < iterations; i++) {
        // 테스트 파일 생성
        const testFile = await createLargeTestFile(testDir, fileSize, `test-${i}.xlsm`);
        testFiles.push(testFile);

        // 처리 전 메모리 스냅샷
        const beforeHeap = process.memoryUsage().heapUsed;

        // 파일 처리
        const processor = await M4ProcessorFactory.createOptimizedDialogueProcessor(
          testFile,
          { validateFileSize: false }
        );

        const outputPath = path.join(testDir, `output-${i}.xlsx`);
        await processor.process(outputPath);

        // 처리 후 메모리 스냅샷
        const afterHeap = process.memoryUsage().heapUsed;
        memorySnapshots.push({
          iteration: i,
          beforeHeap: beforeHeap / 1024 / 1024,
          afterHeap: afterHeap / 1024 / 1024,
          delta: (afterHeap - beforeHeap) / 1024 / 1024
        });

        // 명시적 정리
        if (global.gc) {
          global.gc();
        }

        // 메모리 안정화 대기
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 메모리 누수 분석
      const report = await profiler.stop();
      
      // 메모리 증가 추세 검증
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = lastSnapshot.afterHeap - firstSnapshot.beforeHeap;

      console.log('Memory Leak Test Results:');
      console.log(`Total iterations: ${iterations}`);
      console.log(`Initial heap: ${firstSnapshot.beforeHeap.toFixed(2)} MB`);
      console.log(`Final heap: ${lastSnapshot.afterHeap.toFixed(2)} MB`);
      console.log(`Memory growth: ${memoryGrowth.toFixed(2)} MB`);
      console.log(`Average growth per iteration: ${(memoryGrowth / iterations).toFixed(2)} MB`);

      // 메모리 증가율이 허용 범위 내인지 검증
      const acceptableGrowthPerIteration = 5; // 5MB per iteration
      expect(memoryGrowth / iterations).toBeLessThan(acceptableGrowthPerIteration);
    }, 120000); // 2분 타임아웃

    it('should release memory after gc() calls', async () => {
      const results = [];

      for (let i = 0; i < 5; i++) {
        // 대용량 데이터 생성
        const largeData = new Array(1000000).fill({ 
          id: i, 
          data: 'x'.repeat(100) 
        });

        // 프로세서에서 데이터 처리
        const processor = new M4DialogueProcessorStreaming();
        const beforeHeap = process.memoryUsage().heapUsed;

        // 데이터 처리 시뮬레이션
        await processor.processData(largeData);

        const afterProcessHeap = process.memoryUsage().heapUsed;

        // 명시적 정리
        await processor.cleanup();
        
        // 가비지 컬렉션
        if (global.gc) {
          global.gc();
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const afterGCHeap = process.memoryUsage().heapUsed;

        results.push({
          iteration: i,
          beforeHeap: beforeHeap / 1024 / 1024,
          afterProcess: afterProcessHeap / 1024 / 1024,
          afterGC: afterGCHeap / 1024 / 1024,
          recovered: (afterProcessHeap - afterGCHeap) / 1024 / 1024
        });
      }

      // GC 효과 검증
      const avgRecovered = results.reduce((sum, r) => sum + r.recovered, 0) / results.length;
      console.log(`Average memory recovered by GC: ${avgRecovered.toFixed(2)} MB`);

      expect(avgRecovered).toBeGreaterThan(10); // 최소 10MB 이상 회수
    });

    it('should not leak memory in Worker Threads', async () => {
      const workerCount = 3;
      const tasksPerWorker = 5;
      const memoryBefore = process.memoryUsage().heapUsed;

      // Worker Thread 작업 실행
      const promises = [];
      for (let i = 0; i < workerCount; i++) {
        for (let j = 0; j < tasksPerWorker; j++) {
          const task = workerManager.addTask({
            type: 'dialogue',
            inputFolder: testDir,
            outputFolder: testDir,
            priority: 'normal',
            options: {}
          });
          promises.push(task);
        }
      }

      // 모든 작업 완료 대기
      await Promise.all(promises);

      // Worker 종료
      await workerManager.shutdown();

      // 메모리 정리 대기
      if (global.gc) {
        global.gc();
      }
      await new Promise(resolve => setTimeout(resolve, 500));

      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryLeak = (memoryAfter - memoryBefore) / 1024 / 1024;

      console.log(`Worker Thread memory leak: ${memoryLeak.toFixed(2)} MB`);
      expect(memoryLeak).toBeLessThan(50); // 50MB 미만의 메모리 증가
    });
  });

  describe('Stress Tests', () => {
    it('should handle 1GB file processing', async function() {
      this.timeout(300000); // 5분 타임아웃

      // 1GB 파일 생성
      const largeFile = await createLargeTestFile(
        testDir, 
        1024 * 1024 * 1024, // 1GB
        'large-1gb.xlsm'
      );
      testFiles.push(largeFile);

      // 메모리 모니터링 시작
      memoryMonitor.start();
      const memoryAlerts = [];
      memoryMonitor.on('alert', (alert) => {
        memoryAlerts.push(alert);
      });

      // 스트리밍 프로세서로 처리
      const processor = await M4ProcessorFactory.createOptimizedDialogueProcessor(
        largeFile,
        {
          validateFileSize: true,
          onFileSizeWarning: (validation) => {
            console.log(`File size warning: ${validation.message}`);
          }
        }
      );

      expect(processor.isStreaming).toBe(true); // 스트리밍 모드 확인

      const outputPath = path.join(testDir, 'output-1gb.xlsx');
      const result = await processor.process(outputPath);

      // 결과 검증
      expect(result.success).toBe(true);
      expect(result.rowsProcessed).toBeGreaterThan(0);
      
      // 메모리 사용량 검증
      const peakMemory = memoryMonitor.getReport().peakMemoryUsage / 1024 / 1024;
      console.log(`Peak memory usage for 1GB file: ${peakMemory.toFixed(2)} MB`);
      expect(peakMemory).toBeLessThan(500); // 500MB 미만 사용
    });

    it('should handle multiple concurrent file processing', async () => {
      const fileCount = 5;
      const fileSize = 50 * 1024 * 1024; // 50MB each
      
      // 여러 파일 생성
      const files = [];
      for (let i = 0; i < fileCount; i++) {
        const file = await createLargeTestFile(testDir, fileSize, `concurrent-${i}.xlsm`);
        files.push(file);
        testFiles.push(file);
      }

      // 동시 처리
      memoryMonitor.start();
      const startTime = Date.now();

      const promises = files.map(async (file, index) => {
        const processor = await M4ProcessorFactory.createOptimizedDialogueProcessor(
          file,
          { validateFileSize: false }
        );
        const outputPath = path.join(testDir, `concurrent-output-${index}.xlsx`);
        return processor.process(outputPath);
      });

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // 모든 처리 성공 검증
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      const memoryStats = memoryMonitor.getReport();
      console.log(`Concurrent processing stats:`);
      console.log(`- Files: ${fileCount}`);
      console.log(`- Total time: ${duration}ms`);
      console.log(`- Peak memory: ${(memoryStats.peakMemoryUsage / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- GC count: ${memoryStats.gcCount}`);
    }, 120000);

    it('should survive memory pressure simulation', async () => {
      const memoryPressureSimulator = new EventEmitter();
      let pressureLevel = 0;

      // 메모리 압박 시뮬레이션
      const pressureInterval = setInterval(() => {
        pressureLevel += 10;
        if (pressureLevel > 80) {
          memoryPressureSimulator.emit('high-pressure', pressureLevel);
        }
      }, 1000);

      try {
        // BatchProcessor 생성
        const batchProcessor = BatchProcessor.createMemoryOptimized({
          memoryThreshold: 100,
          autoAdjust: true
        });

        // 압박 상황 처리
        memoryPressureSimulator.on('high-pressure', () => {
          batchProcessor.pause();
          setTimeout(() => batchProcessor.resume(), 500);
        });

        // 대용량 데이터 처리
        const largeDataset = Array.from({ length: 100000 }, (_, i) => ({
          id: i,
          data: 'x'.repeat(1000)
        }));

        const results = await batchProcessor.processBatches(
          largeDataset,
          async (batch) => {
            // 처리 시뮬레이션
            await new Promise(resolve => setTimeout(resolve, 10));
            return batch.map(item => ({ ...item, processed: true }));
          }
        );

        expect(results.length).toBe(largeDataset.length);
        
        const stats = batchProcessor.getStats();
        console.log(`Memory pressure test stats:`);
        console.log(`- Batches processed: ${stats.batchesProcessed}`);
        console.log(`- Adjustments: ${stats.adjustmentCount}`);
        console.log(`- GC count: ${stats.gcCount}`);

      } finally {
        clearInterval(pressureInterval);
      }
    });

    it('should handle continuous processing for extended period', async function() {
      this.timeout(180000); // 3분 타임아웃

      const duration = 60000; // 1분간 연속 처리
      const startTime = Date.now();
      let filesProcessed = 0;
      let totalBytesProcessed = 0;
      const errors = [];

      memoryMonitor.start();

      while (Date.now() - startTime < duration) {
        try {
          // 랜덤 크기 파일 생성 (1MB ~ 20MB)
          const fileSize = (1 + Math.random() * 19) * 1024 * 1024;
          const testFile = await createLargeTestFile(
            testDir, 
            fileSize, 
            `continuous-${filesProcessed}.xlsm`
          );
          testFiles.push(testFile);

          // 파일 처리
          const processor = await M4ProcessorFactory.createOptimizedDialogueProcessor(
            testFile,
            { validateFileSize: false }
          );

          const outputPath = path.join(testDir, `continuous-output-${filesProcessed}.xlsx`);
          const result = await processor.process(outputPath);

          if (result.success) {
            filesProcessed++;
            totalBytesProcessed += fileSize;
          } else {
            errors.push(result.error);
          }

          // 메모리 체크
          const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
          if (currentMemory > 400) {
            console.log(`High memory usage detected: ${currentMemory.toFixed(2)} MB`);
            if (global.gc) {
              global.gc();
            }
          }

        } catch (error) {
          errors.push(error);
        }
      }

      const finalStats = memoryMonitor.getReport();
      console.log(`Continuous processing results:`);
      console.log(`- Duration: ${(Date.now() - startTime) / 1000} seconds`);
      console.log(`- Files processed: ${filesProcessed}`);
      console.log(`- Total data: ${(totalBytesProcessed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- Errors: ${errors.length}`);
      console.log(`- Peak memory: ${(finalStats.peakMemoryUsage / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- GC count: ${finalStats.gcCount}`);

      expect(filesProcessed).toBeGreaterThan(10);
      expect(errors.length).toBeLessThan(filesProcessed * 0.1); // 에러율 10% 미만
    });
  });

  describe('Resource Cleanup Verification', () => {
    it('should properly close all file handles', async () => {
      const openHandles = [];
      
      // 파일 핸들 추적
      const originalOpen = fs.open;
      fs.open = jest.fn(async (...args) => {
        const handle = await originalOpen.apply(fs, args);
        openHandles.push(handle);
        return handle;
      });

      try {
        // 파일 처리
        const testFile = await createLargeTestFile(testDir, 5 * 1024 * 1024, 'handles-test.xlsm');
        testFiles.push(testFile);

        const processor = new M4DialogueProcessorStreaming();
        await processor.processFile(testFile, path.join(testDir, 'handles-output.xlsx'));

        // 모든 핸들이 닫혔는지 확인
        for (const handle of openHandles) {
          await expect(handle.stat()).rejects.toThrow(); // 핸들이 닫혔으면 에러
        }

      } finally {
        fs.open = originalOpen;
      }
    });

    it('should terminate all Worker Threads properly', async () => {
      const manager = new WorkerThreadManager({ maxThreads: 4 });
      
      // 여러 작업 추가
      const tasks = [];
      for (let i = 0; i < 10; i++) {
        tasks.push(manager.addTask({
          type: 'dialogue',
          inputFolder: testDir,
          outputFolder: testDir,
          priority: 'normal',
          options: {}
        }));
      }

      // 일부 작업 완료 대기
      await Promise.race(tasks);

      // 종료
      await manager.shutdown();

      // 모든 워커가 종료되었는지 확인
      const stats = manager.getStats();
      expect(stats.activeWorkers).toBe(0);
      expect(stats.pendingTasks).toBe(0);
    });

    it('should clear all Object Pools', async () => {
      const manager = new ObjectPoolManager();
      
      // 여러 풀 생성 및 사용
      const pools = ['row', 'cell', 'string'].map(name => {
        const pool = manager.createPool(name, () => ({}), {
          initialSize: 10,
          maxSize: 100
        });
        
        // 객체 획득
        for (let i = 0; i < 50; i++) {
          pool.acquire();
        }
        
        return pool;
      });

      // 모든 풀의 통계 확인
      const beforeStats = manager.getAllStats();
      Object.values(beforeStats).forEach(stats => {
        expect(stats.currentSize).toBeGreaterThan(0);
      });

      // 전체 정리
      manager.clearAll();

      // 정리 후 확인
      const afterStats = manager.getAllStats();
      Object.values(afterStats).forEach(stats => {
        expect(stats.currentSize).toBe(0);
      });
    });

    it('should remove all event listeners', async () => {
      const processor = new M4DialogueProcessorStreaming();
      const monitor = new MemoryMonitor();
      const batchProcessor = new BatchProcessor();

      // 이벤트 리스너 추가
      const listeners = {
        progress: jest.fn(),
        error: jest.fn(),
        complete: jest.fn(),
        alert: jest.fn(),
        batchComplete: jest.fn()
      };

      processor.on('progress', listeners.progress);
      processor.on('error', listeners.error);
      processor.on('complete', listeners.complete);
      monitor.on('alert', listeners.alert);
      batchProcessor.on('batchComplete', listeners.batchComplete);

      // 정리
      processor.removeAllListeners();
      monitor.removeAllListeners();
      batchProcessor.removeAllListeners();

      // 이벤트 발생 시도
      processor.emit('progress', {});
      monitor.emit('alert', {});
      batchProcessor.emit('batchComplete', {});

      // 리스너가 호출되지 않았는지 확인
      Object.values(listeners).forEach(listener => {
        expect(listener).not.toHaveBeenCalled();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should integrate all optimization features successfully', async () => {
      // 모든 최적화 기능 활성화
      const testFile = await createLargeTestFile(testDir, 30 * 1024 * 1024, 'integration.xlsm');
      testFiles.push(testFile);

      // 통합 프로파일링
      profiler.start('integration-test');
      memoryMonitor.start();

      // Object Pool 설정
      poolManager.createPool('integration.row', () => ({}), {
        initialSize: 100,
        maxSize: 1000
      });

      // 프로세서 생성 (모든 기능 활성화)
      const processor = await M4ProcessorFactory.createOptimizedDialogueProcessor(
        testFile,
        {
          validateFileSize: true,
          enableProfiling: true,
          enableMemoryMonitoring: true,
          enableObjectPooling: true,
          onProgress: (info) => {
            console.log(`Progress: ${info.percentage}% - ${info.message}`);
          },
          onMemoryAlert: (alert) => {
            console.log(`Memory alert: ${alert.level} - ${alert.message}`);
          }
        }
      );

      const outputPath = path.join(testDir, 'integration-output.xlsx');
      const result = await processor.process(outputPath);

      // 결과 검증
      expect(result.success).toBe(true);
      expect(result.performanceMetrics).toBeDefined();
      expect(result.memoryStats).toBeDefined();
      expect(result.poolStats).toBeDefined();

      // 성능 리포트
      const performanceReport = await profiler.stop();
      const memoryReport = memoryMonitor.getReport();
      const poolStats = poolManager.getAllStats();

      console.log('\n=== Integration Test Report ===');
      console.log(`Total duration: ${performanceReport.totalDuration}ms`);
      console.log(`Rows processed: ${result.rowsProcessed}`);
      console.log(`Processing speed: ${(result.rowsProcessed / (performanceReport.totalDuration / 1000)).toFixed(0)} rows/sec`);
      console.log(`Peak memory: ${(memoryReport.peakMemoryUsage / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Pool hit rate: ${(poolStats['integration.row']?.hitRate || 0).toFixed(2)}`);
      console.log(`GC count: ${memoryReport.gcCount}`);
      console.log('==============================\n');
    });

    it('should maintain performance under various conditions', async () => {
      const scenarios = [
        { size: 1 * 1024 * 1024, name: 'small' },    // 1MB
        { size: 10 * 1024 * 1024, name: 'medium' },  // 10MB
        { size: 50 * 1024 * 1024, name: 'large' },   // 50MB
      ];

      const results = [];

      for (const scenario of scenarios) {
        const testFile = await createLargeTestFile(
          testDir, 
          scenario.size, 
          `perf-${scenario.name}.xlsm`
        );
        testFiles.push(testFile);

        const startTime = Date.now();
        const startMemory = process.memoryUsage().heapUsed;

        const processor = await M4ProcessorFactory.createOptimizedDialogueProcessor(
          testFile,
          { validateFileSize: false }
        );

        const outputPath = path.join(testDir, `perf-output-${scenario.name}.xlsx`);
        const result = await processor.process(outputPath);

        const endTime = Date.now();
        const endMemory = process.memoryUsage().heapUsed;

        results.push({
          scenario: scenario.name,
          size: scenario.size,
          duration: endTime - startTime,
          memoryUsed: (endMemory - startMemory) / 1024 / 1024,
          rowsProcessed: result.rowsProcessed,
          speed: result.rowsProcessed / ((endTime - startTime) / 1000)
        });
      }

      // 성능 일관성 검증
      console.log('\n=== Performance Consistency ===');
      results.forEach(r => {
        console.log(`${r.scenario}: ${r.speed.toFixed(0)} rows/sec, ${r.memoryUsed.toFixed(2)} MB`);
      });

      // 성능 저하가 크기에 비례하는지 확인
      const smallSpeed = results[0].speed;
      const largeSpeed = results[2].speed;
      const speedRatio = largeSpeed / smallSpeed;
      
      expect(speedRatio).toBeGreaterThan(0.5); // 50% 이상의 성능 유지
    });

    it('should handle error scenarios gracefully', async () => {
      const errorScenarios = [
        {
          name: 'corrupted-file',
          setup: async () => {
            const file = path.join(testDir, 'corrupted.xlsm');
            await fs.writeFile(file, 'corrupted data');
            return file;
          }
        },
        {
          name: 'missing-sheets',
          setup: async () => {
            // 빈 Excel 파일 생성
            return await createLargeTestFile(testDir, 1024, 'empty.xlsm', { empty: true });
          }
        },
        {
          name: 'out-of-memory',
          setup: async () => {
            // 메모리 제한 시뮬레이션
            const file = await createLargeTestFile(testDir, 10 * 1024 * 1024, 'oom.xlsm');
            // 인위적으로 메모리 압박 생성
            const bloat = [];
            try {
              for (let i = 0; i < 100; i++) {
                bloat.push(new Array(1024 * 1024).fill('x'));
              }
            } catch (e) {
              // OOM 무시
            }
            return file;
          }
        }
      ];

      for (const scenario of errorScenarios) {
        console.log(`Testing error scenario: ${scenario.name}`);
        
        try {
          const testFile = await scenario.setup();
          testFiles.push(testFile);

          const processor = await M4ProcessorFactory.createOptimizedDialogueProcessor(
            testFile,
            {
              validateFileSize: false,
              onError: (error) => {
                console.log(`Error handled: ${error.message}`);
              }
            }
          );

          const outputPath = path.join(testDir, `error-output-${scenario.name}.xlsx`);
          const result = await processor.process(outputPath);

          // 에러가 적절히 처리되었는지 확인
          if (!result.success) {
            expect(result.error).toBeDefined();
            console.log(`Scenario ${scenario.name} failed as expected: ${result.error}`);
          }

        } catch (error) {
          // 예외가 적절히 처리되었는지 확인
          expect(error).toBeDefined();
          console.log(`Scenario ${scenario.name} threw exception as expected: ${error.message}`);
        }

        // 메모리 정리
        if (global.gc) {
          global.gc();
        }
      }
    });
  });

  describe('Performance Metrics Collection', () => {
    it('should collect comprehensive performance metrics', async () => {
      const testFile = await createLargeTestFile(testDir, 20 * 1024 * 1024, 'metrics.xlsm');
      testFiles.push(testFile);

      // 종합 메트릭 수집
      const metrics = {
        startTime: Date.now(),
        startMemory: process.memoryUsage(),
        gcCountBefore: memoryMonitor.getReport().gcCount,
        cpuUsageBefore: process.cpuUsage()
      };

      const processor = await M4ProcessorFactory.createOptimizedDialogueProcessor(
        testFile,
        {
          validateFileSize: false,
          enableProfiling: true,
          enableMemoryMonitoring: true
        }
      );

      const outputPath = path.join(testDir, 'metrics-output.xlsx');
      const result = await processor.process(outputPath);

      metrics.endTime = Date.now();
      metrics.endMemory = process.memoryUsage();
      metrics.gcCountAfter = memoryMonitor.getReport().gcCount;
      metrics.cpuUsageAfter = process.cpuUsage(metrics.cpuUsageBefore);

      // 메트릭 분석
      const analysis = {
        duration: metrics.endTime - metrics.startTime,
        memoryDelta: {
          heap: (metrics.endMemory.heapUsed - metrics.startMemory.heapUsed) / 1024 / 1024,
          rss: (metrics.endMemory.rss - metrics.startMemory.rss) / 1024 / 1024,
          external: (metrics.endMemory.external - metrics.startMemory.external) / 1024 / 1024
        },
        gcCount: metrics.gcCountAfter - metrics.gcCountBefore,
        cpuTime: {
          user: metrics.cpuUsageAfter.user / 1000,
          system: metrics.cpuUsageAfter.system / 1000
        },
        throughput: {
          rowsPerSecond: result.rowsProcessed / (metrics.duration / 1000),
          mbPerSecond: (20 * 1024 * 1024) / (metrics.duration / 1000) / 1024 / 1024
        }
      };

      console.log('\n=== Performance Metrics ===');
      console.log(JSON.stringify(analysis, null, 2));
      console.log('==========================\n');

      // 성능 기준 검증
      expect(analysis.throughput.rowsPerSecond).toBeGreaterThan(1000);
      expect(analysis.memoryDelta.heap).toBeLessThan(100); // 100MB 미만 증가
    });
  });
});

/**
 * 최종 검증 리포트 생성
 */
async function generateFinalVerificationReport(testResults) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: testResults.length,
      passed: testResults.filter(r => r.status === 'passed').length,
      failed: testResults.filter(r => r.status === 'failed').length
    },
    memoryLeakTests: {
      continuousProcessing: testResults.find(r => r.name === 'continuous-processing'),
      gcEffectiveness: testResults.find(r => r.name === 'gc-effectiveness'),
      workerThreads: testResults.find(r => r.name === 'worker-threads')
    },
    stressTests: {
      largeFile: testResults.find(r => r.name === 'large-file'),
      concurrent: testResults.find(r => r.name === 'concurrent'),
      memoryPressure: testResults.find(r => r.name === 'memory-pressure'),
      continuous: testResults.find(r => r.name === 'continuous')
    },
    resourceCleanup: {
      fileHandles: testResults.find(r => r.name === 'file-handles'),
      workerTermination: testResults.find(r => r.name === 'worker-termination'),
      objectPools: testResults.find(r => r.name === 'object-pools'),
      eventListeners: testResults.find(r => r.name === 'event-listeners')
    },
    integration: {
      allFeatures: testResults.find(r => r.name === 'all-features'),
      performanceConsistency: testResults.find(r => r.name === 'performance-consistency'),
      errorHandling: testResults.find(r => r.name === 'error-handling')
    },
    recommendations: [
      'Monitor memory usage in production environments',
      'Set up alerts for memory thresholds',
      'Implement regular heap snapshots for analysis',
      'Consider implementing memory usage dashboards',
      'Review and optimize batch sizes based on workload'
    ]
  };

  const reportPath = path.join(__dirname, 'test-outputs', 'final-verification-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  return report;
}