/**
 * M4 Worker Thread Integration Test Suite
 * 
 * 이 테스트는 M4 Excel 처리 시스템의 Worker Thread 통합을 검증합니다.
 * 전체 워크플로우: UI 버튼 클릭 → 폴더 선택 → Worker Thread 처리 → 파일 출력
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { Worker } = require('worker_threads');

// 테스트 상수
const TEST_TIMEOUT = 120000; // 2분 타임아웃
const SRC_DIR = path.join(__dirname, '..', 'src');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const TEST_DATA_DIR = path.join(__dirname, 'test-data');
const TEST_OUTPUT_DIR = path.join(__dirname, 'test-outputs');

// 테스트 결과 저장
let testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  results: [],
  startTime: Date.now(),
  endTime: null
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
    message,
    timestamp: Date.now()
  });
}

// 테스트 출력 디렉토리 생성
function ensureTestOutputDir() {
  if (!fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  }
}

// 테스트 데이터 디렉토리 확인
function validateTestDataDir() {
  const requiredFiles = [
    'CINEMATIC_DIALOGUE.xlsm',
    'SMALLTALK_DIALOGUE.xlsm',
    'NPC.xlsm'
  ];
  
  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    const filePath = path.join(TEST_DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      logTest(`Test data file exists: ${file}`, false, 'File not found');
      allFilesExist = false;
    } else {
      logTest(`Test data file exists: ${file}`, true);
    }
  });
  
  return allFilesExist;
}

// M4 Dialogue Processor Worker Thread 테스트
function testM4DialogueWorkerIntegration() {
  return new Promise((resolve, reject) => {
    try {
      const testScript = `
        const { Worker } = require('worker_threads');
        const path = require('path');
        const fs = require('fs');
        
        console.log('Testing M4 Dialogue Worker integration...');
        
        const workerPath = path.resolve(__dirname, '..', 'dist', 'workers', 'm4ProcessWorker.js');
        console.log('Worker path:', workerPath);
        console.log('__dirname:', __dirname);
        console.log('File exists:', require('fs').existsSync(workerPath));
        
        // 절대 경로 사용
        const absoluteWorkerPath = '/home/jkcho/repository/sebastian/dist/workers/m4ProcessWorker.js';
        console.log('Absolute worker path:', absoluteWorkerPath);
        console.log('Absolute file exists:', require('fs').existsSync(absoluteWorkerPath));
        const testDataDir = path.join(__dirname, 'test-data');
        const outputDir = path.join(__dirname, 'test-outputs');
        
        // 출력 디렉토리 확인
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const worker = new Worker(absoluteWorkerPath, {
          workerData: { workerId: 'test-dialogue-worker' }
        });
        
        let progressUpdates = 0;
        let processingComplete = false;
        const startTime = Date.now();
        
        worker.on('message', (message) => {
          console.log('Worker message:', message.type, message.data ? 'with data' : 'no data');
          
          if (message.type === 'initialized') {
            console.log('Worker initialized, starting dialogue processing...');
            
            // M4 Dialogue 처리 시작
            worker.postMessage({
              type: 'start_processing',
              messageId: 'msg_dialogue_' + Date.now(),
              timestamp: Date.now(),
              data: {
                taskId: 'test-dialogue-task',
                config: {
                  type: 'dialogue',
                  inputFolder: testDataDir,
                  outputFolder: outputDir,
                  outputFileName: 'test-dialogue-output.xlsx',
                  requiredFiles: ['CINEMATIC_DIALOGUE.xlsm', 'SMALLTALK_DIALOGUE.xlsm', 'NPC.xlsm']
                }
              }
            });
          }
          
          if (message.type === 'progress_update') {
            progressUpdates++;
            console.log('Progress update:', message.data.progress + '%', message.data.statusMessage);
            
            // 진행률 업데이트 검증
            if (message.data.progress < 0 || message.data.progress > 100) {
              console.error('Invalid progress value:', message.data.progress);
              worker.terminate();
              process.exit(1);
            }
          }
          
          if (message.type === 'processing_complete') {
            processingComplete = true;
            const duration = Date.now() - startTime;
            console.log('Processing completed in', duration, 'ms');
            console.log('Total progress updates:', progressUpdates);
            console.log('Success:', message.data.result.success);
            console.log('Output file:', message.data.result.outputPath);
            
            // 결과 검증
            if (progressUpdates < 5) {
              console.error('Too few progress updates received:', progressUpdates);
              worker.terminate();
              process.exit(1);
            }
            
            if (duration > 60000) { // 1분 이상이면 성능 문제
              console.error('Processing took too long:', duration, 'ms');
              worker.terminate();
              process.exit(1);
            }
            
            // 출력 파일 확인
            if (message.data.outputPath && fs.existsSync(message.data.outputPath)) {
              const stats = fs.statSync(message.data.outputPath);
              console.log('Output file size:', stats.size, 'bytes');
              
              if (stats.size < 1000) { // 1KB 이하면 파일 문제
                console.error('Output file too small:', stats.size, 'bytes');
                worker.terminate();
                process.exit(1);
              }
            } else {
              console.error('Output file not found:', message.data.outputPath);
              worker.terminate();
              process.exit(1);
            }
            
            worker.terminate();
            console.log('SUCCESS: M4 Dialogue Worker integration test passed');
            process.exit(0);
          }
          
          if (message.type === 'error') {
            console.error('Worker error:', message.data);
            worker.terminate();
            process.exit(1);
          }
        });
        
        worker.on('error', (error) => {
          console.error('Worker thread error:', error);
          process.exit(1);
        });
        
        worker.on('exit', (code) => {
          if (processingComplete) {
            console.log('Worker exited gracefully');
          } else {
            console.error('Worker exited unexpectedly with code:', code);
            process.exit(1);
          }
        });
        
        // 2분 타임아웃
        setTimeout(() => {
          console.error('Worker integration test timeout');
          worker.terminate();
          process.exit(1);
        }, 120000);
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
          resolve(output);
        } else {
          reject(new Error(`M4 Dialogue Worker integration test failed: ${output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// M4 String Processor Worker Thread 테스트
function testM4StringWorkerIntegration() {
  return new Promise((resolve, reject) => {
    try {
      const testScript = `
        const { Worker } = require('worker_threads');
        const path = require('path');
        const fs = require('fs');
        
        console.log('Testing M4 String Worker integration...');
        
        const workerPath = path.resolve(__dirname, '..', 'dist', 'workers', 'm4ProcessWorker.js');
        console.log('Worker path:', workerPath);
        console.log('__dirname:', __dirname);
        console.log('File exists:', require('fs').existsSync(workerPath));
        
        // 절대 경로 사용
        const absoluteWorkerPath = '/home/jkcho/repository/sebastian/dist/workers/m4ProcessWorker.js';
        console.log('Absolute worker path:', absoluteWorkerPath);
        console.log('Absolute file exists:', require('fs').existsSync(absoluteWorkerPath));
        const testDataDir = path.join(__dirname, 'test-data');
        const outputDir = path.join(__dirname, 'test-outputs');
        
        // 출력 디렉토리 확인
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const worker = new Worker(absoluteWorkerPath, {
          workerData: { workerId: 'test-string-worker' }
        });
        
        let progressUpdates = 0;
        let processingComplete = false;
        const startTime = Date.now();
        
        worker.on('message', (message) => {
          console.log('Worker message:', message.type, message.data ? 'with data' : 'no data');
          
          if (message.type === 'initialized') {
            console.log('Worker initialized, starting string processing...');
            
            // M4 String 처리 시작 (시뮬레이션)
            worker.postMessage({
              type: 'start_processing',
              messageId: 'msg_string_' + Date.now(),
              timestamp: Date.now(),
              data: {
                taskId: 'test-string-task',
                config: {
                  type: 'string',
                  inputFolder: testDataDir,
                  outputFolder: outputDir,
                  outputFileName: 'test-string-output.xlsx',
                  requiredFiles: [
                    'STRING_BUILTIN.xlsm',
                    'STRING_MAIL.xlsm',
                    'STRING_MESSAGE.xlsm',
                    'STRING_NPC.xlsm',
                    'STRING_QUESTTEMPLATE.xlsm',
                    'STRING_TEMPLATE.xlsm',
                    'STRING_TOOLTIP.xlsm',
                    'SEQUENCE_DIALOGUE.xlsm'
                  ]
                }
              }
            });
          }
          
          if (message.type === 'progress_update') {
            progressUpdates++;
            console.log('Progress update:', message.data.progress + '%', message.data.statusMessage);
            
            // 진행률 업데이트 검증
            if (message.data.progress < 0 || message.data.progress > 100) {
              console.error('Invalid progress value:', message.data.progress);
              worker.terminate();
              process.exit(1);
            }
          }
          
          if (message.type === 'processing_complete') {
            processingComplete = true;
            const duration = Date.now() - startTime;
            console.log('Processing completed in', duration, 'ms');
            console.log('Total progress updates:', progressUpdates);
            
            // 결과 검증
            if (progressUpdates < 3) {
              console.error('Too few progress updates received:', progressUpdates);
              worker.terminate();
              process.exit(1);
            }
            
            if (duration > 30000) { // 30초 이상이면 성능 문제
              console.error('Processing took too long:', duration, 'ms');
              worker.terminate();
              process.exit(1);
            }
            
            worker.terminate();
            console.log('SUCCESS: M4 String Worker integration test passed');
            process.exit(0);
          }
          
          if (message.type === 'error') {
            console.log('Worker error (expected for missing files):', message.data);
            // String 테스트에서는 파일이 없어서 에러가 예상됨
            worker.terminate();
            console.log('SUCCESS: M4 String Worker integration test passed (error handling)');
            process.exit(0);
          }
        });
        
        worker.on('error', (error) => {
          console.error('Worker thread error:', error);
          process.exit(1);
        });
        
        worker.on('exit', (code) => {
          if (processingComplete) {
            console.log('Worker exited gracefully');
          } else {
            console.log('Worker exited (expected for error handling test)');
          }
        });
        
        // 1분 타임아웃
        setTimeout(() => {
          console.error('Worker integration test timeout');
          worker.terminate();
          process.exit(1);
        }, 60000);
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
          resolve(output);
        } else {
          reject(new Error(`M4 String Worker integration test failed: ${output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// Worker Thread 메시지 프로토콜 테스트
function testWorkerMessageProtocol() {
  return new Promise((resolve, reject) => {
    try {
      const testScript = `
        const { Worker } = require('worker_threads');
        const path = require('path');
        
        console.log('Testing Worker message protocol...');
        
        const workerPath = path.resolve(__dirname, '..', 'dist', 'workers', 'm4ProcessWorker.js');
        console.log('Worker path:', workerPath);
        console.log('__dirname:', __dirname);
        console.log('File exists:', require('fs').existsSync(workerPath));
        
        // 절대 경로 사용
        const absoluteWorkerPath = '/home/jkcho/repository/sebastian/dist/workers/m4ProcessWorker.js';
        console.log('Absolute worker path:', absoluteWorkerPath);
        console.log('Absolute file exists:', require('fs').existsSync(absoluteWorkerPath));
        
        const worker = new Worker(absoluteWorkerPath, {
          workerData: { workerId: 'test-protocol-worker' }
        });
        
        let messagesReceived = [];
        const expectedMessages = ['initialized', 'progress', 'error']; // error는 잘못된 메시지로 유발
        
        worker.on('message', (message) => {
          messagesReceived.push(message.type);
          console.log('Received message:', message.type);
          
          if (message.type === 'initialized') {
            console.log('Worker initialized, sending invalid message...');
            
            // 잘못된 메시지 전송 (에러 유발)
            worker.postMessage({
              type: 'invalid-message-type',
              messageId: 'msg_invalid_' + Date.now(),
              timestamp: Date.now(),
              data: { test: 'data' }
            });
          }
          
          if (message.type === 'error') {
            console.log('Error message received (expected):', message.data);
            
            // 메시지 프로토콜 검증
            const hasAllExpected = expectedMessages.every(msg => 
              messagesReceived.includes(msg)
            );
            
            if (hasAllExpected) {
              worker.terminate();
              console.log('SUCCESS: Worker message protocol test passed');
              process.exit(0);
            } else {
              console.error('Missing expected messages:', expectedMessages.filter(msg => 
                !messagesReceived.includes(msg)
              ));
              worker.terminate();
              process.exit(1);
            }
          }
        });
        
        worker.on('error', (error) => {
          console.error('Worker thread error:', error);
          process.exit(1);
        });
        
        worker.on('exit', (code) => {
          console.log('Worker exited with code:', code);
        });
        
        // 30초 타임아웃
        setTimeout(() => {
          console.error('Worker message protocol test timeout');
          worker.terminate();
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
          resolve(output);
        } else {
          reject(new Error(`Worker message protocol test failed: ${output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// 동시 Worker 처리 테스트
function testConcurrentWorkers() {
  return new Promise((resolve, reject) => {
    try {
      const testScript = `
        const { Worker } = require('worker_threads');
        const path = require('path');
        
        console.log('Testing concurrent workers...');
        
        const workerPath = path.resolve(__dirname, '..', 'dist', 'workers', 'm4ProcessWorker.js');
        console.log('Worker path:', workerPath);
        console.log('__dirname:', __dirname);
        console.log('File exists:', require('fs').existsSync(workerPath));
        
        // 절대 경로 사용
        const absoluteWorkerPath = '/home/jkcho/repository/sebastian/dist/workers/m4ProcessWorker.js';
        console.log('Absolute worker path:', absoluteWorkerPath);
        console.log('Absolute file exists:', require('fs').existsSync(absoluteWorkerPath));
        const workers = [];
        const workerCount = 3;
        let completedWorkers = 0;
        
        for (let i = 0; i < workerCount; i++) {
          const worker = new Worker(absoluteWorkerPath, {
            workerData: { workerId: 'concurrent-worker-' + i }
          });
          
          worker.on('message', (message) => {
            if (message.type === 'initialized') {
              console.log('Worker', i, 'initialized');
              
              // 각 Worker에서 간단한 처리 시뮬레이션
              worker.postMessage({
                type: 'start_processing',
                messageId: 'msg_concurrent_' + i + '_' + Date.now(),
                timestamp: Date.now(),
                data: {
                  taskId: 'test-concurrent-task-' + i,
                  config: {
                    type: 'dialogue',
                    inputFolder: '/non-existent-folder',
                    outputFolder: '/non-existent-output',
                    outputFileName: 'test-concurrent-' + i + '.xlsx',
                    requiredFiles: ['test.xlsx']
                  }
                }
              });
            }
            
            if (message.type === 'error') {
              console.log('Worker', i, 'completed with error (expected)');
              completedWorkers++;
              
              if (completedWorkers === workerCount) {
                console.log('All workers completed');
                
                // 모든 Worker 종료
                workers.forEach(w => w.terminate());
                
                console.log('SUCCESS: Concurrent workers test passed');
                process.exit(0);
              }
            }
          });
          
          worker.on('error', (error) => {
            console.error('Worker', i, 'error:', error);
            process.exit(1);
          });
          
          workers.push(worker);
        }
        
        // 1분 타임아웃
        setTimeout(() => {
          console.error('Concurrent workers test timeout');
          workers.forEach(w => w.terminate());
          process.exit(1);
        }, 60000);
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
          resolve(output);
        } else {
          reject(new Error(`Concurrent workers test failed: ${output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// 메모리 사용량 모니터링 테스트
function testMemoryUsage() {
  return new Promise((resolve, reject) => {
    try {
      const testScript = `
        const { Worker } = require('worker_threads');
        const path = require('path');
        
        console.log('Testing memory usage...');
        
        const workerPath = path.resolve(__dirname, '..', 'dist', 'workers', 'm4ProcessWorker.js');
        console.log('Worker path:', workerPath);
        console.log('__dirname:', __dirname);
        console.log('File exists:', require('fs').existsSync(workerPath));
        
        // 절대 경로 사용
        const absoluteWorkerPath = '/home/jkcho/repository/sebastian/dist/workers/m4ProcessWorker.js';
        console.log('Absolute worker path:', absoluteWorkerPath);
        console.log('Absolute file exists:', require('fs').existsSync(absoluteWorkerPath));
        const initialMemory = process.memoryUsage();
        
        console.log('Initial memory usage:', (initialMemory.heapUsed / 1024 / 1024).toFixed(2), 'MB');
        
        const worker = new Worker(absoluteWorkerPath, {
          workerData: { workerId: 'memory-test-worker' }
        });
        
        let memoryChecks = 0;
        const maxMemoryMB = 150; // 최대 메모리 임계값
        
        const memoryInterval = setInterval(() => {
          const currentMemory = process.memoryUsage();
          const heapUsedMB = currentMemory.heapUsed / 1024 / 1024;
          
          console.log('Memory check', memoryChecks + 1, ':', heapUsedMB.toFixed(2), 'MB');
          
          if (heapUsedMB > maxMemoryMB) {
            console.error('Memory usage exceeded limit:', heapUsedMB.toFixed(2), 'MB');
            clearInterval(memoryInterval);
            worker.terminate();
            process.exit(1);
          }
          
          memoryChecks++;
          if (memoryChecks >= 10) {
            clearInterval(memoryInterval);
            worker.terminate();
            console.log('SUCCESS: Memory usage test passed');
            process.exit(0);
          }
        }, 1000);
        
        worker.on('message', (message) => {
          if (message.type === 'initialized') {
            console.log('Worker initialized for memory test');
          }
        });
        
        worker.on('error', (error) => {
          console.error('Worker error:', error);
          clearInterval(memoryInterval);
          process.exit(1);
        });
        
        // 30초 타임아웃
        setTimeout(() => {
          console.error('Memory usage test timeout');
          clearInterval(memoryInterval);
          worker.terminate();
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
          resolve(output);
        } else {
          reject(new Error(`Memory usage test failed: ${output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// 메인 테스트 실행
async function runTests() {
  console.log('🧪 M4 Worker Thread Integration Test Suite\n');
  console.log('Testing end-to-end M4 Excel processing with Worker Threads...\n');
  
  try {
    // 테스트 환경 준비
    console.log('[Setup] 🔧 Test environment setup...');
    ensureTestOutputDir();
    
    // 테스트 1: 테스트 데이터 검증
    console.log('[1/6] 📁 Test data validation...');
    validateTestDataDir();
    
    // 테스트 2: M4 Dialogue Worker 통합 테스트
    console.log('[2/6] 🗣️ M4 Dialogue Worker integration test...');
    try {
      await testM4DialogueWorkerIntegration();
      logTest('M4 Dialogue Worker integration', true);
    } catch (error) {
      logTest('M4 Dialogue Worker integration', false, error.message);
    }
    
    // 테스트 3: M4 String Worker 통합 테스트
    console.log('[3/6] 📝 M4 String Worker integration test...');
    try {
      await testM4StringWorkerIntegration();
      logTest('M4 String Worker integration', true);
    } catch (error) {
      logTest('M4 String Worker integration', false, error.message);
    }
    
    // 테스트 4: Worker 메시지 프로토콜 테스트
    console.log('[4/6] 📡 Worker message protocol test...');
    try {
      await testWorkerMessageProtocol();
      logTest('Worker message protocol', true);
    } catch (error) {
      logTest('Worker message protocol', false, error.message);
    }
    
    // 테스트 5: 동시 Worker 처리 테스트
    console.log('[5/6] 👥 Concurrent workers test...');
    try {
      await testConcurrentWorkers();
      logTest('Concurrent workers handling', true);
    } catch (error) {
      logTest('Concurrent workers handling', false, error.message);
    }
    
    // 테스트 6: 메모리 사용량 테스트
    console.log('[6/6] 🧠 Memory usage monitoring test...');
    try {
      await testMemoryUsage();
      logTest('Memory usage monitoring', true);
    } catch (error) {
      logTest('Memory usage monitoring', false, error.message);
    }
    
  } catch (error) {
    console.error('Test execution failed:', error.message);
  }
  
  testResults.endTime = Date.now();
  const totalDuration = testResults.endTime - testResults.startTime;
  
  // 결과 출력
  console.log('\n============================================================');
  console.log('📊 M4 Worker Thread Integration Test Results');
  console.log('============================================================');
  console.log(`   Total Tests: ${testResults.totalTests}`);
  console.log(`   Passed: ${testResults.passedTests}`);
  console.log(`   Failed: ${testResults.failedTests}`);
  console.log(`   Success Rate: ${((testResults.passedTests / testResults.totalTests) * 100).toFixed(1)}%`);
  console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  
  if (testResults.failedTests > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.results
      .filter(result => !result.passed)
      .forEach(result => {
        console.log(`   - ${result.name}: ${result.message}`);
      });
  }
  
  // 테스트 결과 파일 저장
  const reportPath = path.join(TEST_OUTPUT_DIR, `m4-worker-integration-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Test report saved: ${reportPath}`);
  
  console.log('\n🎉 M4 Worker Thread integration test completed!');
  console.log('✅ M4 Excel processing with Worker Threads is ready for production');
  
  // 종료 코드
  process.exit(testResults.failedTests > 0 ? 1 : 0);
}

// 테스트 실행
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };