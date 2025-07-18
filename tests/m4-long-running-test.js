const { describe, it, before, after, expect } = require('@jest/globals');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const { MemoryLeakDetector } = require('./memory-leak-detector');
const { createLargeTestFile, cleanupTestFiles } = require('./test-utils');

// Performance 모듈들
const { MemoryMonitor } = require('../src/services/m4/performance/memory-monitor');
const { ObjectPoolManager } = require('../src/services/m4/performance/object-pool');
const { PerformanceProfiler } = require('../src/services/m4/performance/profiler');

// M4 프로세서들
const { M4ProcessorFactory } = require('../src/services/m4/processors/processorFactory');
const { WorkerThreadManager } = require('../src/services/workerThreadManager');

/**
 * 장시간 실행 테스트
 * 실제 운영 환경을 시뮬레이션하여 메모리 누수 및 성능 저하를 감지
 */
describe('Long Running and Memory Leak Tests', () => {
  let testDir;
  let leakDetector;
  let memoryMonitor;
  let testFiles = [];

  before(async () => {
    testDir = path.join(__dirname, 'test-outputs', `long-running-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // 메모리 누수 감지기 설정
    leakDetector = new MemoryLeakDetector({
      snapshotInterval: 60000, // 1분마다 스냅샷
      maxSnapshots: 20,
      outputDir: path.join(testDir, 'heap-snapshots'),
      retainedSizeThreshold: 50 * 1024 * 1024, // 50MB
      growthRateThreshold: 0.05 // 5% 성장률
    });

    memoryMonitor = new MemoryMonitor({
      interval: 5000, // 5초마다 체크
      heapWarning: 400,
      heapCritical: 700
    });
  });

  after(async () => {
    await cleanupTestFiles(testDir, testFiles);
  });

  describe('Extended Duration Tests', () => {
    it('should maintain stable memory usage over 10 minutes', async function() {
      this.timeout(660000); // 11분 타임아웃

      const duration = 10 * 60 * 1000; // 10분
      const startTime = Date.now();
      const fileSize = 5 * 1024 * 1024; // 5MB
      let processedCount = 0;
      const memorySnapshots = [];

      // 메모리 누수 감지 시작
      await leakDetector.start();
      memoryMonitor.start();

      console.log('\n=== Starting 10-minute stability test ===');

      // 메모리 모니터링 이벤트
      memoryMonitor.on('alert', (alert) => {
        console.log(`Memory alert [${alert.level}]: ${alert.message}`);
      });

      while (Date.now() - startTime < duration) {
        try {
          // 테스트 파일 생성
          const testFile = await createLargeTestFile(
            testDir, 
            fileSize, 
            `stability-${processedCount}.xlsm`
          );
          testFiles.push(testFile);

          // 프로세서 생성 및 처리
          const processor = await M4ProcessorFactory.createOptimizedDialogueProcessor(
            testFile,
            { validateFileSize: false }
          );

          const outputPath = path.join(testDir, `stability-output-${processedCount}.xlsx`);
          await processor.process(outputPath);

          processedCount++;

          // 메모리 스냅샷
          if (processedCount % 10 === 0) {
            const memoryUsage = process.memoryUsage();
            memorySnapshots.push({
              count: processedCount,
              timestamp: Date.now() - startTime,
              heapUsed: memoryUsage.heapUsed / 1024 / 1024,
              heapTotal: memoryUsage.heapTotal / 1024 / 1024,
              rss: memoryUsage.rss / 1024 / 1024
            });

            console.log(`Processed ${processedCount} files - Heap: ${memorySnapshots[memorySnapshots.length - 1].heapUsed.toFixed(2)} MB`);
          }

          // 간헐적 GC
          if (processedCount % 20 === 0 && global.gc) {
            global.gc();
          }

          // CPU 쿨다운
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Error at file ${processedCount}: ${error.message}`);
        }
      }

      // 메모리 누수 분석
      const leakReport = await leakDetector.stop();
      const finalReport = await leakDetector.generateReport(
        path.join(testDir, 'memory-leak-report.json')
      );

      console.log('\n=== 10-minute test completed ===');
      console.log(`Files processed: ${processedCount}`);
      console.log(`Duration: ${(Date.now() - startTime) / 1000 / 60} minutes`);
      console.log(`Memory leaks detected: ${leakReport.leakCandidates.length}`);

      // 메모리 성장률 검증
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowthRate = (lastSnapshot.heapUsed - firstSnapshot.heapUsed) / firstSnapshot.heapUsed;

      console.log(`Memory growth rate: ${(memoryGrowthRate * 100).toFixed(2)}%`);

      // 허용 가능한 성장률 검증 (10분 동안 20% 이하)
      expect(memoryGrowthRate).toBeLessThan(0.2);
      expect(leakReport.leakCandidates.length).toBe(0);
    });

    it('should handle 100 consecutive file operations', async function() {
      this.timeout(300000); // 5분 타임아웃

      const targetCount = 100;
      const results = [];
      const errors = [];

      console.log('\n=== Starting 100 file consecutive test ===');

      // 워커 스레드 매니저
      const workerManager = new WorkerThreadManager({ maxThreads: 2 });

      for (let i = 0; i < targetCount; i++) {
        try {
          // 파일 크기 변화 (1MB ~ 10MB)
          const fileSize = (1 + Math.floor(Math.random() * 9)) * 1024 * 1024;
          const testFile = await createLargeTestFile(
            testDir,
            fileSize,
            `consecutive-${i}.xlsm`
          );
          testFiles.push(testFile);

          const startTime = Date.now();
          const startMemory = process.memoryUsage().heapUsed;

          // 워커 스레드로 처리
          const result = await workerManager.addTask({
            type: 'dialogue',
            inputFolder: path.dirname(testFile),
            outputFolder: testDir,
            priority: 'normal',
            options: { specificFile: testFile }
          });

          const endTime = Date.now();
          const endMemory = process.memoryUsage().heapUsed;

          results.push({
            index: i,
            fileSize: fileSize / 1024 / 1024,
            duration: endTime - startTime,
            memoryDelta: (endMemory - startMemory) / 1024 / 1024,
            success: result.success
          });

          // 진행률 표시
          if ((i + 1) % 10 === 0) {
            const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
            const avgMemory = results.reduce((sum, r) => sum + Math.abs(r.memoryDelta), 0) / results.length;
            
            console.log(`Progress: ${i + 1}/${targetCount} - Avg time: ${avgDuration.toFixed(0)}ms, Avg memory: ${avgMemory.toFixed(2)}MB`);
          }

        } catch (error) {
          errors.push({ index: i, error: error.message });
          console.error(`Error at file ${i}: ${error.message}`);
        }
      }

      // 워커 종료
      await workerManager.shutdown();

      // 결과 분석
      const successCount = results.filter(r => r.success).length;
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const maxMemoryDelta = Math.max(...results.map(r => Math.abs(r.memoryDelta)));

      console.log('\n=== Consecutive test results ===');
      console.log(`Total processed: ${results.length}`);
      console.log(`Success rate: ${(successCount / targetCount * 100).toFixed(2)}%`);
      console.log(`Average duration: ${avgDuration.toFixed(0)}ms`);
      console.log(`Max memory delta: ${maxMemoryDelta.toFixed(2)}MB`);
      console.log(`Errors: ${errors.length}`);

      // 성공률 검증 (95% 이상)
      expect(successCount / targetCount).toBeGreaterThan(0.95);
      // 메모리 델타 검증 (최대 100MB)
      expect(maxMemoryDelta).toBeLessThan(100);
    });
  });

  describe('Memory Leak Specific Tests', () => {
    it('should detect and report memory leaks in streaming processor', async function() {
      this.timeout(180000); // 3분 타임아웃

      const iterations = 50;
      const heapSnapshots = [];
      
      console.log('\n=== Testing streaming processor for memory leaks ===');

      // 초기 메모리 스냅샷
      if (global.gc) global.gc();
      const initialHeap = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        // 큰 파일로 스트리밍 프로세서 강제
        const testFile = await createLargeTestFile(
          testDir,
          60 * 1024 * 1024, // 60MB
          `leak-test-${i}.xlsm`
        );
        testFiles.push(testFile);

        // 스트리밍 프로세서 사용
        const processor = await M4ProcessorFactory.createOptimizedDialogueProcessor(
          testFile,
          { 
            validateFileSize: false,
            forceStreaming: true
          }
        );

        const outputPath = path.join(testDir, `leak-output-${i}.xlsx`);
        await processor.process(outputPath);

        // 주기적 메모리 체크
        if (i % 10 === 0) {
          if (global.gc) global.gc();
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const currentHeap = process.memoryUsage().heapUsed;
          heapSnapshots.push({
            iteration: i,
            heap: currentHeap / 1024 / 1024,
            delta: (currentHeap - initialHeap) / 1024 / 1024
          });
          
          console.log(`Iteration ${i}: Heap ${heapSnapshots[heapSnapshots.length - 1].heap.toFixed(2)} MB, Delta: ${heapSnapshots[heapSnapshots.length - 1].delta.toFixed(2)} MB`);
        }
      }

      // 선형 회귀로 누수 패턴 분석
      const xValues = heapSnapshots.map(s => s.iteration);
      const yValues = heapSnapshots.map(s => s.heap);
      
      const n = xValues.length;
      const sumX = xValues.reduce((a, b) => a + b, 0);
      const sumY = yValues.reduce((a, b) => a + b, 0);
      const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
      const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const leakRatePerIteration = slope; // MB per iteration

      console.log(`\nLeak analysis: ${leakRatePerIteration.toFixed(3)} MB per iteration`);

      // 허용 가능한 누수율 검증 (반복당 0.5MB 이하)
      expect(Math.abs(leakRatePerIteration)).toBeLessThan(0.5);
    });

    it('should cleanup Object Pools without memory leaks', async () => {
      const poolManager = new ObjectPoolManager();
      const iterations = 1000;
      const memoryCheckpoints = [];

      console.log('\n=== Testing Object Pool memory management ===');

      // 여러 풀 생성
      const pools = ['row', 'cell', 'string', 'buffer'].map(name => 
        poolManager.createPool(name, () => ({
          data: new Array(1000).fill(0),
          id: Math.random()
        }), {
          initialSize: 10,
          maxSize: 1000,
          expansionSize: 50
        })
      );

      // 초기 메모리
      if (global.gc) global.gc();
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        // 각 풀에서 객체 획득/반환
        const acquired = [];
        
        for (const pool of pools) {
          const count = Math.floor(Math.random() * 50) + 10;
          for (let j = 0; j < count; j++) {
            acquired.push({ pool, obj: pool.acquire() });
          }
        }

        // 일부 객체 유지, 나머지 반환
        const toRelease = acquired.slice(0, Math.floor(acquired.length * 0.8));
        for (const { pool, obj } of toRelease) {
          pool.release(obj);
        }

        // 주기적 체크포인트
        if (i % 100 === 0) {
          const currentMemory = process.memoryUsage().heapUsed;
          memoryCheckpoints.push({
            iteration: i,
            memory: currentMemory / 1024 / 1024,
            poolStats: poolManager.getAllStats()
          });

          // 풀 크기 조정
          if (currentMemory > initialMemory * 2) {
            pools.forEach(pool => pool.clear());
            if (global.gc) global.gc();
          }
        }
      }

      // 최종 정리
      poolManager.clearAll();
      if (global.gc) global.gc();
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryLeak = (finalMemory - initialMemory) / 1024 / 1024;

      console.log(`Object Pool leak test: ${memoryLeak.toFixed(2)} MB leaked after ${iterations} iterations`);

      // 통계 출력
      const finalStats = poolManager.getAllStats();
      Object.entries(finalStats).forEach(([name, stats]) => {
        console.log(`Pool ${name}: Created ${stats.created}, Hit rate ${(stats.hitRate * 100).toFixed(2)}%`);
      });

      // 메모리 누수 검증 (10MB 이하)
      expect(memoryLeak).toBeLessThan(10);
    });

    it('should prevent event emitter leaks', async () => {
      const { EventEmitter } = require('events');
      const emitters = [];
      const listenerCounts = [];

      console.log('\n=== Testing EventEmitter leak prevention ===');

      // 많은 이벤트 이미터 생성
      for (let i = 0; i < 100; i++) {
        const emitter = new EventEmitter();
        emitter.setMaxListeners(100); // 경고 방지
        
        // 리스너 추가
        for (let j = 0; j < 50; j++) {
          emitter.on(`event-${j}`, () => {
            // 무거운 클로저
            const data = new Array(1000).fill(Math.random());
            return data.reduce((a, b) => a + b);
          });
        }
        
        emitters.push(emitter);
        listenerCounts.push(emitter.listenerCount());
      }

      // 메모리 사용량 체크
      const beforeCleanup = process.memoryUsage().heapUsed;

      // 모든 리스너 제거
      emitters.forEach(emitter => {
        emitter.removeAllListeners();
      });

      // GC 및 메모리 체크
      if (global.gc) global.gc();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const afterCleanup = process.memoryUsage().heapUsed;
      const memoryRecovered = (beforeCleanup - afterCleanup) / 1024 / 1024;

      console.log(`EventEmitter cleanup recovered: ${memoryRecovered.toFixed(2)} MB`);

      // 메모리 회수 검증
      expect(memoryRecovered).toBeGreaterThan(5); // 최소 5MB 회수
      
      // 리스너 제거 검증
      emitters.forEach(emitter => {
        expect(emitter.listenerCount()).toBe(0);
      });
    });
  });

  describe('Resource Exhaustion Tests', () => {
    it('should handle out-of-memory scenarios gracefully', async function() {
      this.timeout(120000); // 2분 타임아웃

      console.log('\n=== Testing OOM handling ===');

      const memoryHogs = [];
      let oomHandled = false;

      // OOM 핸들러 설정
      const originalHandler = process.listeners('uncaughtException');
      process.removeAllListeners('uncaughtException');
      process.on('uncaughtException', (error) => {
        if (error.message.includes('out of memory') || error.code === 'ERR_WORKER_OUT_OF_MEMORY') {
          oomHandled = true;
          console.log('OOM caught and handled');
          
          // 메모리 해제 시도
          memoryHogs.length = 0;
          if (global.gc) global.gc();
        }
      });

      try {
        // 점진적으로 메모리 사용 증가
        for (let i = 0; i < 100; i++) {
          try {
            // 큰 버퍼 할당
            const size = 10 * 1024 * 1024; // 10MB
            const buffer = Buffer.alloc(size);
            memoryHogs.push(buffer);

            // 메모리 체크
            const memUsage = process.memoryUsage();
            const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
            
            if (heapPercent > 90) {
              console.log(`Heap usage critical: ${heapPercent.toFixed(2)}%`);
              
              // 일부 메모리 해제
              memoryHogs.splice(0, Math.floor(memoryHogs.length / 2));
              if (global.gc) global.gc();
            }

          } catch (error) {
            if (error.message.includes('Cannot allocate memory')) {
              oomHandled = true;
              console.log('Allocation failed, cleaning up...');
              break;
            }
            throw error;
          }
        }

        // 정리
        memoryHogs.length = 0;
        if (global.gc) global.gc();

      } finally {
        // 원래 핸들러 복원
        process.removeAllListeners('uncaughtException');
        originalHandler.forEach(handler => process.on('uncaughtException', handler));
      }

      console.log(`OOM test completed. Handled: ${oomHandled}`);
    });

    it('should handle file descriptor exhaustion', async function() {
      this.timeout(60000); // 1분 타임아웃

      const handles = [];
      let maxHandles = 0;
      let exhaustionHandled = false;

      console.log('\n=== Testing file descriptor exhaustion ===');

      try {
        // 많은 파일 핸들 열기 시도
        for (let i = 0; i < 10000; i++) {
          try {
            const testFile = path.join(testDir, `fd-test-${i}.txt`);
            await fs.writeFile(testFile, 'test');
            const handle = await fs.open(testFile, 'r');
            handles.push(handle);
            maxHandles = i + 1;
          } catch (error) {
            if (error.code === 'EMFILE' || error.code === 'ENFILE') {
              exhaustionHandled = true;
              console.log(`File descriptor limit reached at ${maxHandles} handles`);
              break;
            }
            throw error;
          }
        }

      } finally {
        // 모든 핸들 닫기
        for (const handle of handles) {
          try {
            await handle.close();
          } catch (error) {
            // 무시
          }
        }
      }

      console.log(`Max file handles opened: ${maxHandles}`);
      expect(maxHandles).toBeGreaterThan(0);
    });
  });
});

/**
 * 메모리 프로파일 리포트 생성
 */
async function generateMemoryProfile(outputPath) {
  const profile = {
    timestamp: new Date().toISOString(),
    platform: {
      os: os.platform(),
      arch: os.arch(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      nodeVersion: process.version
    },
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      resourceUsage: process.resourceUsage()
    },
    v8: {
      heapStatistics: v8.getHeapStatistics(),
      heapSpaceStatistics: v8.getHeapSpaceStatistics()
    }
  };

  await fs.writeFile(outputPath, JSON.stringify(profile, null, 2));
  return profile;
}