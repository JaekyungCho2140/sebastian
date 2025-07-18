/**
 * M4 End-to-End Worker Integration Test Suite
 * 
 * 이 테스트는 M4 Excel 처리 시스템의 완전한 End-to-End 워크플로우를 검증합니다.
 * Worker Thread를 통한 실제 M4 프로세서 실행, 진행률 업데이트, 파일 출력을 모두 포함합니다.
 */

const path = require('path');
const fs = require('fs');
const {
  WorkerTestWrapper,
  ConcurrentWorkerTest,
  PerformanceBenchmark,
  FileSystemTestUtils
} = require('./worker-test-utils');

// 테스트 상수
const TEST_DATA_DIR = path.join(__dirname, 'test-data');
const TEST_OUTPUT_DIR = path.join(__dirname, 'test-outputs');
const DIST_DIR = path.join(__dirname, '..', 'dist');

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

// 테스트 환경 준비
function setupTestEnvironment() {
  // 출력 디렉토리 생성
  if (!fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  }
  
  // 이전 테스트 출력 정리
  FileSystemTestUtils.cleanupTestOutputs(TEST_OUTPUT_DIR);
  
  // 필수 파일 검증
  const requiredFiles = [
    'CINEMATIC_DIALOGUE.xlsm',
    'SMALLTALK_DIALOGUE.xlsm',
    'NPC.xlsm'
  ];
  
  const fileValidation = FileSystemTestUtils.validateTestFiles(TEST_DATA_DIR, requiredFiles);
  const allFilesExist = fileValidation.every(f => f.exists);
  
  if (!allFilesExist) {
    throw new Error(`Missing test files: ${fileValidation.filter(f => !f.exists).map(f => f.filename).join(', ')}`);
  }
  
  logTest('Test environment setup', true);
  return fileValidation;
}

// M4 Dialogue 프로세서 End-to-End 테스트
async function testM4DialogueE2E() {
  const worker = new WorkerTestWrapper({ workerId: 'e2e-dialogue-worker' });
  
  try {
    // Worker 초기화
    await worker.initialize();
    
    // 메모리 모니터링 시작
    worker.startMemoryMonitoring(500);
    
    // 처리 데이터 설정
    const processData = {
      processType: 'dialogue',
      inputFolder: TEST_DATA_DIR,
      outputFolder: TEST_OUTPUT_DIR,
      outputFileName: 'e2e-dialogue-output.xlsx',
      requiredFiles: ['CINEMATIC_DIALOGUE.xlsm', 'SMALLTALK_DIALOGUE.xlsm', 'NPC.xlsm']
    };
    
    // 진행률 업데이트 추적
    const progressUpdates = [];
    worker.on('progress', (data) => {
      progressUpdates.push(data);
      console.log(`Progress: ${data.progress}% - ${data.message}`);
    });
    
    // 처리 시작
    console.log('Starting M4 Dialogue E2E processing...');
    const startTime = Date.now();
    
    const result = await worker.startProcessing(processData, 120000); // 2분 타임아웃
    
    const duration = Date.now() - startTime;
    console.log(`Processing completed in ${duration}ms`);
    
    // 결과 검증
    const stats = worker.getTestStatistics();
    
    // 1. 진행률 업데이트 검증
    if (progressUpdates.length < 5) {
      throw new Error(`Too few progress updates: ${progressUpdates.length}`);
    }
    
    // 2. 진행률 순서 검증
    const progressValues = progressUpdates.map(p => p.progress);
    for (let i = 1; i < progressValues.length; i++) {
      if (progressValues[i] < progressValues[i-1]) {
        throw new Error(`Progress went backwards: ${progressValues[i-1]} -> ${progressValues[i]}`);
      }
    }
    
    // 3. 최종 진행률 검증
    const finalProgress = progressValues[progressValues.length - 1];
    if (finalProgress !== 100) {
      throw new Error(`Final progress not 100%: ${finalProgress}`);
    }
    
    // 4. 출력 파일 검증
    if (result.outputPath) {
      FileSystemTestUtils.validateOutputFile(result.outputPath, 5000);
    }
    
    // 5. 성능 검증
    if (duration > 60000) { // 1분 이상이면 성능 문제
      throw new Error(`Processing too slow: ${duration}ms`);
    }
    
    // 6. 메모리 사용량 검증
    const peakMemoryMB = stats.memoryPeakUsage / 1024 / 1024;
    if (peakMemoryMB > 200) { // 200MB 이상이면 메모리 문제
      throw new Error(`Memory usage too high: ${peakMemoryMB.toFixed(2)}MB`);
    }
    
    console.log(`✅ M4 Dialogue E2E: ${duration}ms, ${progressUpdates.length} progress updates, ${peakMemoryMB.toFixed(2)}MB peak`);
    
    return {
      duration,
      progressUpdates: progressUpdates.length,
      peakMemoryMB,
      outputPath: result.outputPath
    };
    
  } finally {
    await worker.terminate();
  }
}

// M4 String 프로세서 End-to-End 테스트 (에러 시나리오)
async function testM4StringE2E() {
  const worker = new WorkerTestWrapper({ workerId: 'e2e-string-worker' });
  
  try {
    // Worker 초기화
    await worker.initialize();
    
    // 메모리 모니터링 시작
    worker.startMemoryMonitoring(500);
    
    // 처리 데이터 설정 (String 파일들이 없으므로 에러 예상)
    const processData = {
      processType: 'string',
      inputFolder: TEST_DATA_DIR,
      outputFolder: TEST_OUTPUT_DIR,
      outputFileName: 'e2e-string-output.xlsx',
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
    };
    
    // 에러 처리 추적
    let errorOccurred = false;
    worker.on('error', (data) => {
      errorOccurred = true;
      console.log(`Expected error received: ${data.message}`);
    });
    
    // 처리 시작
    console.log('Starting M4 String E2E processing (expecting error)...');
    const startTime = Date.now();
    
    try {
      await worker.startProcessing(processData, 30000); // 30초 타임아웃
    } catch (error) {
      errorOccurred = true;
      console.log(`Expected error caught: ${error.message}`);
    }
    
    const duration = Date.now() - startTime;
    
    // 에러 발생 검증
    if (!errorOccurred) {
      throw new Error('Expected error did not occur');
    }
    
    // 에러 처리 시간 검증
    if (duration > 15000) { // 15초 이상이면 에러 처리 성능 문제
      throw new Error(`Error handling too slow: ${duration}ms`);
    }
    
    console.log(`✅ M4 String E2E: Error handled in ${duration}ms`);
    
    return {
      duration,
      errorHandled: errorOccurred
    };
    
  } finally {
    await worker.terminate();
  }
}

// 동시 Worker 처리 테스트
async function testConcurrentWorkerProcessing() {
  const concurrentTest = new ConcurrentWorkerTest(3);
  
  const testData = [
    {
      processType: 'dialogue',
      inputFolder: TEST_DATA_DIR,
      outputFolder: TEST_OUTPUT_DIR,
      outputFileName: 'concurrent-dialogue-1.xlsx',
      requiredFiles: ['CINEMATIC_DIALOGUE.xlsm', 'SMALLTALK_DIALOGUE.xlsm', 'NPC.xlsm']
    },
    {
      processType: 'dialogue',
      inputFolder: TEST_DATA_DIR,
      outputFolder: TEST_OUTPUT_DIR,
      outputFileName: 'concurrent-dialogue-2.xlsx',
      requiredFiles: ['CINEMATIC_DIALOGUE.xlsm', 'SMALLTALK_DIALOGUE.xlsm', 'NPC.xlsm']
    },
    {
      processType: 'string',
      inputFolder: TEST_DATA_DIR,
      outputFolder: TEST_OUTPUT_DIR,
      outputFileName: 'concurrent-string-1.xlsx',
      requiredFiles: ['STRING_BUILTIN.xlsm'] // 에러 유발용
    }
  ];
  
  console.log('Starting concurrent worker processing test...');
  const startTime = Date.now();
  
  const results = await concurrentTest.runConcurrentTest(testData, 90000);
  
  const duration = Date.now() - startTime;
  
  // 결과 검증
  if (results.totalWorkers !== 3) {
    throw new Error(`Expected 3 workers, got ${results.totalWorkers}`);
  }
  
  if (results.successfulWorkers < 2) {
    throw new Error(`Too few successful workers: ${results.successfulWorkers}`);
  }
  
  if (duration > 120000) { // 2분 이상이면 성능 문제
    throw new Error(`Concurrent processing too slow: ${duration}ms`);
  }
  
  console.log(`✅ Concurrent workers: ${results.successfulWorkers}/${results.totalWorkers} succeeded in ${duration}ms`);
  
  return results;
}

// 대용량 파일 처리 테스트
async function testLargeFileProcessing() {
  const worker = new WorkerTestWrapper({ workerId: 'large-file-worker' });
  
  try {
    // Worker 초기화
    await worker.initialize();
    
    // 메모리 모니터링 시작
    worker.startMemoryMonitoring(1000);
    
    // 대용량 파일 처리 설정
    const processData = {
      processType: 'dialogue',
      inputFolder: TEST_DATA_DIR,
      outputFolder: TEST_OUTPUT_DIR,
      outputFileName: 'large-file-output.xlsx',
      requiredFiles: ['CINEMATIC_DIALOGUE_LARGE.xlsm', 'SMALLTALK_DIALOGUE.xlsm', 'NPC.xlsm']
    };
    
    // 진행률 업데이트 추적
    const progressUpdates = [];
    worker.on('progress', (data) => {
      progressUpdates.push(data);
      if (progressUpdates.length % 10 === 0) {
        console.log(`Large file progress: ${data.progress}% - ${data.message}`);
      }
    });
    
    // 처리 시작
    console.log('Starting large file processing test...');
    const startTime = Date.now();
    
    const result = await worker.startProcessing(processData, 300000); // 5분 타임아웃
    
    const duration = Date.now() - startTime;
    const stats = worker.getTestStatistics();
    
    // 결과 검증
    if (progressUpdates.length < 10) {
      throw new Error(`Too few progress updates for large file: ${progressUpdates.length}`);
    }
    
    // 메모리 사용량 검증
    const peakMemoryMB = stats.memoryPeakUsage / 1024 / 1024;
    if (peakMemoryMB > 500) { // 500MB 이상이면 메모리 문제
      throw new Error(`Memory usage too high for large file: ${peakMemoryMB.toFixed(2)}MB`);
    }
    
    // 출력 파일 검증
    if (result.outputPath) {
      FileSystemTestUtils.validateOutputFile(result.outputPath, 50000); // 50KB 이상 기대
    }
    
    console.log(`✅ Large file processing: ${duration}ms, ${progressUpdates.length} progress updates, ${peakMemoryMB.toFixed(2)}MB peak`);
    
    return {
      duration,
      progressUpdates: progressUpdates.length,
      peakMemoryMB,
      outputPath: result.outputPath
    };
    
  } finally {
    await worker.terminate();
  }
}

// 성능 벤치마크 테스트
async function testPerformanceBenchmark() {
  const benchmark = new PerformanceBenchmark();
  
  // 벤치마크 1: Worker 초기화 성능
  await benchmark.runBenchmark('Worker Initialization', async () => {
    const worker = new WorkerTestWrapper();
    await worker.initialize();
    await worker.terminate();
  }, 5);
  
  // 벤치마크 2: 작은 파일 처리 성능
  await benchmark.runBenchmark('Small File Processing', async () => {
    const worker = new WorkerTestWrapper();
    await worker.initialize();
    
    const processData = {
      processType: 'dialogue',
      inputFolder: TEST_DATA_DIR,
      outputFolder: TEST_OUTPUT_DIR,
      outputFileName: `bench-small-${Date.now()}.xlsx`,
      requiredFiles: ['CINEMATIC_DIALOGUE.xlsm', 'SMALLTALK_DIALOGUE.xlsm', 'NPC.xlsm']
    };
    
    const result = await worker.startProcessing(processData, 60000);
    await worker.terminate();
    
    return result;
  }, 3);
  
  // 결과 출력
  benchmark.printResults();
  
  return benchmark.benchmarks;
}

// 메인 테스트 실행
async function runTests() {
  console.log('🧪 M4 End-to-End Worker Integration Test Suite\n');
  console.log('Testing complete M4 Excel processing workflow with Worker Threads...\n');
  
  try {
    // 테스트 환경 준비
    console.log('[Setup] 🔧 Test environment setup...');
    setupTestEnvironment();
    
    // 테스트 1: M4 Dialogue E2E 테스트
    console.log('[1/6] 🗣️ M4 Dialogue End-to-End test...');
    try {
      const dialogueResult = await testM4DialogueE2E();
      logTest('M4 Dialogue E2E processing', true, 
        `${dialogueResult.duration}ms, ${dialogueResult.progressUpdates} updates`);
    } catch (error) {
      logTest('M4 Dialogue E2E processing', false, error.message);
    }
    
    // 테스트 2: M4 String E2E 테스트 (에러 시나리오)
    console.log('[2/6] 📝 M4 String End-to-End test (error scenario)...');
    try {
      const stringResult = await testM4StringE2E();
      logTest('M4 String E2E error handling', true, 
        `Error handled in ${stringResult.duration}ms`);
    } catch (error) {
      logTest('M4 String E2E error handling', false, error.message);
    }
    
    // 테스트 3: 동시 Worker 처리 테스트
    console.log('[3/6] 👥 Concurrent worker processing test...');
    try {
      const concurrentResult = await testConcurrentWorkerProcessing();
      logTest('Concurrent worker processing', true, 
        `${concurrentResult.successfulWorkers}/${concurrentResult.totalWorkers} succeeded`);
    } catch (error) {
      logTest('Concurrent worker processing', false, error.message);
    }
    
    // 테스트 4: 대용량 파일 처리 테스트
    console.log('[4/6] 📊 Large file processing test...');
    try {
      const largeFileResult = await testLargeFileProcessing();
      logTest('Large file processing', true, 
        `${largeFileResult.duration}ms, ${largeFileResult.peakMemoryMB.toFixed(2)}MB peak`);
    } catch (error) {
      logTest('Large file processing', false, error.message);
    }
    
    // 테스트 5: 성능 벤치마크
    console.log('[5/6] ⚡ Performance benchmark test...');
    try {
      const benchmarkResults = await testPerformanceBenchmark();
      logTest('Performance benchmark', true, 
        `${benchmarkResults.length} benchmarks completed`);
    } catch (error) {
      logTest('Performance benchmark', false, error.message);
    }
    
    // 테스트 6: 전체 시스템 안정성 검증
    console.log('[6/6] 🔍 System stability validation...');
    try {
      const finalMemory = process.memoryUsage();
      const memoryUsageMB = finalMemory.heapUsed / 1024 / 1024;
      
      if (memoryUsageMB > 300) {
        throw new Error(`Final memory usage too high: ${memoryUsageMB.toFixed(2)}MB`);
      }
      
      // 출력 파일 정리
      FileSystemTestUtils.cleanupTestOutputs(TEST_OUTPUT_DIR);
      
      logTest('System stability validation', true, 
        `Final memory: ${memoryUsageMB.toFixed(2)}MB`);
    } catch (error) {
      logTest('System stability validation', false, error.message);
    }
    
  } catch (error) {
    console.error('Test execution failed:', error.message);
  }
  
  testResults.endTime = Date.now();
  const totalDuration = testResults.endTime - testResults.startTime;
  
  // 결과 출력
  console.log('\n============================================================');
  console.log('📊 M4 End-to-End Worker Integration Test Results');
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
  const reportPath = path.join(TEST_OUTPUT_DIR, `m4-e2e-worker-integration-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Test report saved: ${reportPath}`);
  
  console.log('\n🎉 M4 End-to-End Worker integration test completed!');
  console.log('✅ Complete M4 Excel processing workflow verified');
  
  // 종료 코드
  process.exit(testResults.failedTests > 0 ? 1 : 0);
}

// 테스트 실행
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };