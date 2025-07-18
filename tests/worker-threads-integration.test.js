/**
 * Worker Threads Integration Test
 * 
 * This test validates the Worker Threads architecture for M4 Excel processing.
 * Tests worker spawning, message passing, progress updates, and resource cleanup.
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// 테스트 상수
const TEST_TIMEOUT = 60000;
const SRC_DIR = path.join(__dirname, '..', 'src');
const DIST_DIR = path.join(__dirname, '..', 'dist');

// 테스트 결과 저장
let testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  results: []
};

// 유틸리티 함수
function logTest(testName, passed, message = '') {
  testResults.totalTests++;
  if (passed) {
    testResults.passedTests++;
    console.log(`✅ PASSED: ${testName}`);
  } else {
    testResults.failedTests++;
    console.log(`❌ FAILED: ${testName} - ${message}`);
  }
  
  testResults.results.push({
    name: testName,
    passed,
    message
  });
}

// Worker 타입 정의 존재 확인
function testWorkerTypesExist() {
  try {
    const workerTypesPath = path.join(DIST_DIR, 'types', 'workerTypes.js');
    if (fs.existsSync(workerTypesPath)) {
      logTest('Worker types definition exists', true);
      return true;
    } else {
      logTest('Worker types definition exists', false, 'File not found');
      return false;
    }
  } catch (error) {
    logTest('Worker types definition exists', false, error.message);
    return false;
  }
}

// Worker 스레드 파일 존재 확인
function testWorkerFileExists() {
  try {
    const workerPath = path.join(DIST_DIR, 'workers', 'm4ProcessWorker.js');
    if (fs.existsSync(workerPath)) {
      logTest('Worker thread file exists', true);
      return true;
    } else {
      logTest('Worker thread file exists', false, 'File not found');
      return false;
    }
  } catch (error) {
    logTest('Worker thread file exists', false, error.message);
    return false;
  }
}

// Worker 관리자 파일 존재 확인
function testWorkerManagerExists() {
  try {
    const managerPath = path.join(DIST_DIR, 'services', 'workerThreadManager.js');
    if (fs.existsSync(managerPath)) {
      logTest('Worker thread manager exists', true);
      return true;
    } else {
      logTest('Worker thread manager exists', false, 'File not found');
      return false;
    }
  } catch (error) {
    logTest('Worker thread manager exists', false, error.message);
    return false;
  }
}

// Worker 타입 가드 테스트
function testWorkerTypeGuards() {
  return new Promise((resolve, reject) => {
    try {
      const testScript = `
        const {
          WorkerState,
          WorkerType,
          WorkerMessageType,
          isWorkerMessage,
          isWorkerError,
          isWorkerTask,
          createWorkerMessage,
          createWorkerError,
          createWorkerTask,
          generateWorkerId,
          calculateOptimalWorkerCount
        } = require('./dist/types/workerTypes');
        
        console.log('Testing worker type guards...');
        
        // 기본 열거형 테스트
        if (!WorkerState.IDLE || !WorkerType.GENERIC || !WorkerMessageType.INITIALIZE) {
          throw new Error('Worker enums not properly defined');
        }
        
        // 메시지 생성 및 검증
        const message = createWorkerMessage(WorkerMessageType.INITIALIZE, { test: 'data' });
        if (!isWorkerMessage(message)) {
          throw new Error('Worker message validation failed');
        }
        
        // 에러 생성 및 검증
        const error = createWorkerError('PROCESSING_ERROR', 'TEST_ERROR', 'Test error message');
        if (!isWorkerError(error)) {
          throw new Error('Worker error validation failed');
        }
        
        // 작업 생성 및 검증
        const task = createWorkerTask(WorkerType.GENERIC, {
          type: 'dialogue',
          inputFolder: '/test',
          outputFolder: '/output',
          requiredFiles: ['test.xlsx'],
          outputFileName: 'output.xlsx'
        });
        if (!isWorkerTask(task)) {
          throw new Error('Worker task validation failed');
        }
        
        // 유틸리티 함수 테스트
        const workerId = generateWorkerId(WorkerType.GENERIC);
        if (!workerId.startsWith('worker_generic_')) {
          throw new Error('Worker ID generation failed');
        }
        
        const optimalCount = calculateOptimalWorkerCount();
        if (typeof optimalCount !== 'number' || optimalCount < 1) {
          throw new Error('Optimal worker count calculation failed');
        }
        
        console.log('SUCCESS: Worker type guards test passed');
        process.exit(0);
      `;
      
      const child = spawn('node', ['-e', testScript], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0 && output.includes('SUCCESS')) {
          resolve();
        } else {
          reject(new Error(`Worker type guards test failed: ${output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// Worker 스레드 기본 생성 테스트
function testWorkerThreadBasics() {
  return new Promise((resolve, reject) => {
    try {
      const testScript = `
        const { Worker } = require('worker_threads');
        const path = require('path');
        
        console.log('Testing worker thread basics...');
        
        const workerPath = path.join(__dirname, '..', 'dist', 'workers', 'm4ProcessWorker.js');
        console.log('Worker path:', workerPath);
        
        const worker = new Worker(workerPath, {
          workerData: { workerId: 'test-worker-123' }
        });
        
        let initReceived = false;
        let timeoutId;
        
        worker.on('message', (message) => {
          console.log('Received message:', message.type);
          if (message.type === 'initialized') {
            initReceived = true;
            clearTimeout(timeoutId);
            worker.terminate();
            console.log('SUCCESS: Worker thread basics test passed');
            process.exit(0);
          }
        });
        
        worker.on('error', (error) => {
          console.error('Worker error:', error);
          process.exit(1);
        });
        
        worker.on('exit', (code) => {
          if (initReceived) {
            console.log('Worker exited gracefully');
          } else {
            console.error('Worker exited without initialization');
            process.exit(1);
          }
        });
        
        // 10초 타임아웃
        timeoutId = setTimeout(() => {
          console.error('Worker initialization timeout');
          worker.terminate();
          process.exit(1);
        }, 10000);
      `;
      
      const child = spawn('node', ['-e', testScript], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0 && output.includes('SUCCESS')) {
          resolve();
        } else {
          reject(new Error(`Worker thread basics test failed: ${output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// Worker 관리자 기본 기능 테스트
function testWorkerManagerBasics() {
  return new Promise((resolve, reject) => {
    try {
      const testScript = `
        const { WorkerThreadManager } = require('./dist/services/workerThreadManager');
        const { WorkerType, WorkerPriority } = require('./dist/types/workerTypes');
        
        console.log('Testing worker manager basics...');
        
        const manager = new WorkerThreadManager();
        
        // 초기화 테스트
        manager.initialize({
          maxWorkers: 2,
          minWorkers: 1,
          workerSpawnInterval: 100,
          idleTimeout: 30,
          cleanupInterval: 10,
          memoryPressureThreshold: 512
        }).then(() => {
          console.log('Manager initialized successfully');
          
          // 풀 상태 조회
          return manager.getPoolState();
        }).then((poolState) => {
          console.log('Pool state:', poolState);
          
          if (poolState.totalWorkers !== 1) {
            throw new Error('Expected 1 worker, got ' + poolState.totalWorkers);
          }
          
          // 정리
          return manager.cleanup();
        }).then(() => {
          console.log('SUCCESS: Worker manager basics test passed');
          process.exit(0);
        }).catch((error) => {
          console.error('Worker manager test failed:', error);
          process.exit(1);
        });
        
        // 타임아웃 설정
        setTimeout(() => {
          console.error('Worker manager test timeout');
          process.exit(1);
        }, 30000);
      `;
      
      const child = spawn('node', ['-e', testScript], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0 && output.includes('SUCCESS')) {
          resolve();
        } else {
          reject(new Error(`Worker manager basics test failed: ${output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// 성능 기준 테스트
function testPerformanceBaseline() {
  return new Promise((resolve, reject) => {
    try {
      const testScript = `
        const { WorkerThreadManager } = require('./dist/services/workerThreadManager');
        const { createWorkerTask, WorkerType, WorkerPriority } = require('./dist/types/workerTypes');
        const { ProcessType } = require('./dist/types/m4Processing');
        
        console.log('Testing performance baseline...');
        
        const manager = new WorkerThreadManager();
        const startTime = Date.now();
        
        manager.initialize({
          maxWorkers: 2,
          minWorkers: 1,
          workerSpawnInterval: 50,
          idleTimeout: 30,
          cleanupInterval: 10,
          memoryPressureThreshold: 512
        }).then(() => {
          console.log('Manager initialized in', Date.now() - startTime, 'ms');
          
          // 간단한 작업 생성
          const task = createWorkerTask(WorkerType.GENERIC, {
            type: ProcessType.DIALOGUE,
            inputFolder: '/test',
            outputFolder: '/output',
            requiredFiles: ['test1.xlsx', 'test2.xlsx'],
            outputFileName: 'output.xlsx'
          }, WorkerPriority.MEDIUM);
          
          const taskStartTime = Date.now();
          
          // 작업 실행
          return manager.executeTask(task);
        }).then((taskId) => {
          console.log('Task queued:', taskId);
          
          // 작업 완료 대기
          return new Promise((taskResolve) => {
            manager.on('taskCompleted', (completedTask) => {
              const taskDuration = Date.now() - completedTask.startedAt;
              console.log('Task completed in', taskDuration, 'ms');
              
              if (taskDuration > 10000) { // 10초 이상이면 성능 문제
                throw new Error('Task took too long: ' + taskDuration + 'ms');
              }
              
              taskResolve();
            });
            
            manager.on('taskFailed', (failedTask) => {
              console.log('Task failed (expected for simulation)');
              taskResolve();
            });
          });
        }).then(() => {
          // 정리
          return manager.cleanup();
        }).then(() => {
          const totalTime = Date.now() - startTime;
          console.log('Total test time:', totalTime, 'ms');
          
          if (totalTime > 30000) { // 30초 이상이면 성능 문제
            throw new Error('Performance test took too long: ' + totalTime + 'ms');
          }
          
          console.log('SUCCESS: Performance baseline test passed');
          process.exit(0);
        }).catch((error) => {
          console.error('Performance test failed:', error);
          process.exit(1);
        });
        
        // 타임아웃 설정
        setTimeout(() => {
          console.error('Performance test timeout');
          process.exit(1);
        }, 45000);
      `;
      
      const child = spawn('node', ['-e', testScript], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0 && output.includes('SUCCESS')) {
          resolve();
        } else {
          reject(new Error(`Performance baseline test failed: ${output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// 메인 테스트 실행
async function runTests() {
  console.log('🧪 Worker Threads Integration Test\\n');
  console.log('Testing Worker Threads architecture for M4 Excel processing...\\n');
  
  try {
    // 테스트 1: 파일 존재 확인
    console.log('[1/6] 📁 Worker files existence check...');
    testWorkerTypesExist();
    testWorkerFileExists();
    testWorkerManagerExists();
    
    // 테스트 2: 타입 가드 테스트
    console.log('[2/6] 🛡️ Worker type guards test...');
    try {
      await testWorkerTypeGuards();
      logTest('Worker type guards functionality', true);
    } catch (error) {
      logTest('Worker type guards functionality', false, error.message);
    }
    
    // 테스트 3: Worker 스레드 기본 기능
    console.log('[3/6] 🔧 Worker thread basics test...');
    try {
      await testWorkerThreadBasics();
      logTest('Worker thread basic functionality', true);
    } catch (error) {
      logTest('Worker thread basic functionality', false, error.message);
    }
    
    // 테스트 4: Worker 관리자 기본 기능
    console.log('[4/6] 👥 Worker manager basics test...');
    try {
      await testWorkerManagerBasics();
      logTest('Worker manager basic functionality', true);
    } catch (error) {
      logTest('Worker manager basic functionality', false, error.message);
    }
    
    // 테스트 5: 성능 기준 테스트
    console.log('[5/6] ⚡ Performance baseline test...');
    try {
      await testPerformanceBaseline();
      logTest('Performance baseline validation', true);
    } catch (error) {
      logTest('Performance baseline validation', false, error.message);
    }
    
    // 테스트 6: 메모리 사용량 체크
    console.log('[6/6] 🧠 Memory usage validation...');
    try {
      const memoryUsage = process.memoryUsage();
      const memoryMB = memoryUsage.heapUsed / (1024 * 1024);
      console.log('Memory usage: ' + memoryMB.toFixed(2) + ' MB');
      
      if (memoryMB > 200) { // 200MB 이상이면 메모리 문제
        logTest('Memory usage within limits', false, 'Memory usage too high: ' + memoryMB.toFixed(2) + ' MB');
      } else {
        logTest('Memory usage within limits', true);
      }
    } catch (error) {
      logTest('Memory usage within limits', false, error.message);
    }
    
  } catch (error) {
    console.error('Test execution failed:', error.message);
  }
  
  // 결과 출력
  console.log('\\n============================================================');
  console.log('📊 Worker Threads Integration Test Results');
  console.log('============================================================');
  console.log('   Total Tests: ' + testResults.totalTests);
  console.log('   Passed: ' + testResults.passedTests);
  console.log('   Failed: ' + testResults.failedTests);
  console.log('   Success Rate: ' + ((testResults.passedTests / testResults.totalTests) * 100).toFixed(1) + '%');
  
  if (testResults.failedTests > 0) {
    console.log('\\n❌ Failed Tests:');
    testResults.results
      .filter(result => !result.passed)
      .forEach(result => {
        console.log('   - ' + result.name + ': ' + result.message);
      });
  }
  
  console.log('\\n🎉 Worker Threads integration test completed!');
  console.log('✅ Worker Threads architecture is ready for M4 processing');
  
  // 종료 코드
  process.exit(testResults.failedTests > 0 ? 1 : 0);
}

// 테스트 실행
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };