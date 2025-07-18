/**
 * Worker Thread Test Utilities
 * 
 * M4 Worker Thread 통합 테스트를 위한 유틸리티 함수들입니다.
 * Worker Thread 생성, 메시지 통신, 성능 모니터링 등을 지원합니다.
 */

const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');

// 테스트 상수
const WORKER_PATH = path.resolve(__dirname, '..', 'dist', 'workers', 'm4ProcessWorker.js');
const DEFAULT_TIMEOUT = 60000; // 60초

/**
 * Worker Thread 테스트 래퍼 클래스
 */
class WorkerTestWrapper extends EventEmitter {
  constructor(workerData = {}) {
    super();
    this.workerData = { workerId: `test-worker-${Date.now()}`, ...workerData };
    this.worker = null;
    this.isInitialized = false;
    this.messages = [];
    this.startTime = null;
    this.endTime = null;
    this.progressUpdates = [];
    this.errors = [];
    this.memoryUsage = [];
  }

  /**
   * Worker Thread 초기화
   */
  async initialize(timeout = DEFAULT_TIMEOUT) {
    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(WORKER_PATH, {
          workerData: this.workerData
        });

        this.startTime = Date.now();
        
        // 메시지 리스너 설정
        this.worker.on('message', (message) => {
          this.handleMessage(message);
        });

        this.worker.on('error', (error) => {
          this.handleError(error);
          reject(error);
        });

        this.worker.on('exit', (code) => {
          this.endTime = Date.now();
          this.emit('exit', code);
        });

        // 초기화 대기
        this.once('initialized', () => {
          this.isInitialized = true;
          resolve();
        });

        // 타임아웃 설정
        const timeoutId = setTimeout(() => {
          if (!this.isInitialized) {
            this.terminate();
            reject(new Error('Worker initialization timeout'));
          }
        }, timeout);

        this.once('initialized', () => {
          clearTimeout(timeoutId);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 메시지 처리
   */
  handleMessage(message) {
    this.messages.push({
      ...message,
      timestamp: Date.now()
    });

    switch (message.type) {
      case 'initialized':
        this.emit('initialized');
        break;
      
      case 'progress':
        this.progressUpdates.push({
          ...message.data,
          timestamp: Date.now()
        });
        this.emit('progress', message.data);
        break;
      
      case 'complete':
        this.emit('complete', message.data);
        break;
      
      case 'error':
        this.errors.push({
          ...message.data,
          timestamp: Date.now()
        });
        this.emit('error', message.data);
        break;
      
      default:
        this.emit('message', message);
    }
  }

  /**
   * 에러 처리
   */
  handleError(error) {
    this.errors.push({
      error: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });
    this.emit('workerError', error);
  }

  /**
   * 처리 작업 시작
   */
  async startProcessing(processData, timeout = DEFAULT_TIMEOUT) {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized) {
        reject(new Error('Worker not initialized'));
        return;
      }

      let completed = false;

      // 완료 리스너
      const completeHandler = (data) => {
        completed = true;
        resolve(data);
      };

      // 에러 리스너
      const errorHandler = (data) => {
        completed = true;
        reject(new Error(data.message || 'Processing failed'));
      };

      this.once('complete', completeHandler);
      this.once('error', errorHandler);

      // 처리 시작 메시지 전송 (올바른 Worker 메시지 형식)
      this.worker.postMessage({
        type: 'start_processing',
        messageId: `msg_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        data: processData
      });

      // 타임아웃 설정
      const timeoutId = setTimeout(() => {
        if (!completed) {
          this.removeListener('complete', completeHandler);
          this.removeListener('error', errorHandler);
          reject(new Error('Processing timeout'));
        }
      }, timeout);

      this.once('complete', () => clearTimeout(timeoutId));
      this.once('error', () => clearTimeout(timeoutId));
    });
  }

  /**
   * 메모리 사용량 모니터링 시작
   */
  startMemoryMonitoring(interval = 1000) {
    this.memoryInterval = setInterval(() => {
      const usage = process.memoryUsage();
      this.memoryUsage.push({
        ...usage,
        timestamp: Date.now()
      });
    }, interval);
  }

  /**
   * 메모리 사용량 모니터링 중지
   */
  stopMemoryMonitoring() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
  }

  /**
   * Worker 종료
   */
  async terminate() {
    if (this.worker) {
      this.stopMemoryMonitoring();
      await this.worker.terminate();
      this.endTime = Date.now();
    }
  }

  /**
   * 테스트 통계 수집
   */
  getTestStatistics() {
    const duration = this.endTime ? this.endTime - this.startTime : Date.now() - this.startTime;
    
    return {
      duration,
      messageCount: this.messages.length,
      progressUpdateCount: this.progressUpdates.length,
      errorCount: this.errors.length,
      memoryPeakUsage: this.memoryUsage.length > 0 ? 
        Math.max(...this.memoryUsage.map(m => m.heapUsed)) : 0,
      memoryAverageUsage: this.memoryUsage.length > 0 ? 
        this.memoryUsage.reduce((sum, m) => sum + m.heapUsed, 0) / this.memoryUsage.length : 0,
      initialized: this.isInitialized
    };
  }
}

/**
 * 여러 Worker Thread 동시 실행 테스트 유틸리티
 */
class ConcurrentWorkerTest {
  constructor(workerCount = 3) {
    this.workerCount = workerCount;
    this.workers = [];
    this.results = [];
    this.errors = [];
  }

  /**
   * 동시 Worker 테스트 실행
   */
  async runConcurrentTest(testData, timeout = DEFAULT_TIMEOUT * 2) {
    const promises = [];

    for (let i = 0; i < this.workerCount; i++) {
      const worker = new WorkerTestWrapper({ workerId: `concurrent-${i}` });
      this.workers.push(worker);

      const promise = this.runSingleWorker(worker, testData[i] || testData[0], timeout);
      promises.push(promise);
    }

    try {
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.results.push({
            workerId: index,
            ...result.value
          });
        } else {
          this.errors.push({
            workerId: index,
            error: result.reason.message
          });
        }
      });

      return {
        totalWorkers: this.workerCount,
        successfulWorkers: this.results.length,
        failedWorkers: this.errors.length,
        results: this.results,
        errors: this.errors
      };

    } finally {
      // 모든 Worker 정리
      await Promise.all(this.workers.map(worker => worker.terminate()));
    }
  }

  /**
   * 단일 Worker 실행
   */
  async runSingleWorker(worker, testData, timeout) {
    await worker.initialize();
    worker.startMemoryMonitoring();

    try {
      const result = await worker.startProcessing(testData, timeout);
      return {
        result,
        statistics: worker.getTestStatistics()
      };
    } finally {
      worker.stopMemoryMonitoring();
    }
  }
}

/**
 * 성능 벤치마크 테스트 유틸리티
 */
class PerformanceBenchmark {
  constructor() {
    this.benchmarks = [];
  }

  /**
   * 벤치마크 실행
   */
  async runBenchmark(name, testFunction, iterations = 1) {
    const results = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      try {
        const result = await testFunction();
        
        const endTime = Date.now();
        const endMemory = process.memoryUsage();

        results.push({
          iteration: i + 1,
          duration: endTime - startTime,
          memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
          result,
          success: true
        });

      } catch (error) {
        results.push({
          iteration: i + 1,
          error: error.message,
          success: false
        });
      }

      // 메모리 정리를 위한 대기
      if (global.gc) {
        global.gc();
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const benchmark = {
      name,
      iterations,
      results,
      statistics: this.calculateStatistics(results)
    };

    this.benchmarks.push(benchmark);
    return benchmark;
  }

  /**
   * 통계 계산
   */
  calculateStatistics(results) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (successful.length === 0) {
      return {
        successCount: 0,
        failureCount: failed.length,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        averageMemoryDelta: 0
      };
    }

    const durations = successful.map(r => r.duration);
    const memoryDeltas = successful.map(r => r.memoryDelta);

    return {
      successCount: successful.length,
      failureCount: failed.length,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      averageMemoryDelta: memoryDeltas.reduce((sum, d) => sum + d, 0) / memoryDeltas.length
    };
  }

  /**
   * 벤치마크 결과 출력
   */
  printResults() {
    console.log('\n📊 Performance Benchmark Results');
    console.log('================================================');

    this.benchmarks.forEach(benchmark => {
      console.log(`\n🔍 ${benchmark.name}`);
      console.log(`   Iterations: ${benchmark.iterations}`);
      console.log(`   Success: ${benchmark.statistics.successCount}`);
      console.log(`   Failure: ${benchmark.statistics.failureCount}`);
      
      if (benchmark.statistics.successCount > 0) {
        console.log(`   Average Duration: ${benchmark.statistics.averageDuration.toFixed(2)}ms`);
        console.log(`   Min Duration: ${benchmark.statistics.minDuration}ms`);
        console.log(`   Max Duration: ${benchmark.statistics.maxDuration}ms`);
        console.log(`   Average Memory Delta: ${(benchmark.statistics.averageMemoryDelta / 1024 / 1024).toFixed(2)}MB`);
      }
    });
  }
}

/**
 * 파일 시스템 테스트 유틸리티
 */
class FileSystemTestUtils {
  /**
   * 테스트 파일 존재 확인
   */
  static validateTestFiles(testDataDir, requiredFiles) {
    const results = [];
    
    requiredFiles.forEach(filename => {
      const filePath = path.join(testDataDir, filename);
      const exists = fs.existsSync(filePath);
      
      results.push({
        filename,
        exists,
        path: filePath,
        size: exists ? fs.statSync(filePath).size : 0
      });
    });

    return results;
  }

  /**
   * 출력 파일 검증
   */
  static validateOutputFile(filePath, expectedMinSize = 1000) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Output file not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    if (stats.size < expectedMinSize) {
      throw new Error(`Output file too small: ${stats.size} bytes (expected min: ${expectedMinSize})`);
    }

    return {
      exists: true,
      size: stats.size,
      path: filePath
    };
  }

  /**
   * 테스트 출력 디렉토리 정리
   */
  static cleanupTestOutputs(outputDir) {
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      files.forEach(file => {
        if (file.startsWith('test-') && file.endsWith('.xlsx')) {
          fs.unlinkSync(path.join(outputDir, file));
        }
      });
    }
  }
}

module.exports = {
  WorkerTestWrapper,
  ConcurrentWorkerTest,
  PerformanceBenchmark,
  FileSystemTestUtils,
  WORKER_PATH,
  DEFAULT_TIMEOUT
};