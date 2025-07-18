/**
 * MessagePriority 시스템 테스트
 */

const { readFileSync } = require('fs');
const path = require('path');

// 테스트 결과 저장
const testResults = {
  tests: [],
  passed: 0,
  failed: 0,
  timestamp: new Date().toISOString()
};

function addTestResult(testName, passed, message = '') {
  const result = {
    name: testName,
    passed,
    message,
    timestamp: new Date().toISOString()
  };
  testResults.tests.push(result);
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: ${message}`);
  }
}

console.log('🧪 MessagePriority 시스템 테스트 시작\n');

// 1. 타입 파일 존재 확인
try {
  const workerTypesPath = path.join(__dirname, '..', 'src', 'types', 'workerTypes.ts');
  const workerTypesContent = readFileSync(workerTypesPath, 'utf8');
  
  // MessagePriority enum 존재 확인
  const hasMessagePriority = workerTypesContent.includes('export enum MessagePriority');
  addTestResult('MessagePriority enum 정의 존재', hasMessagePriority, 
    !hasMessagePriority ? 'MessagePriority enum이 정의되지 않음' : '');
  
  // 우선순위 레벨 확인
  const priorities = ['URGENT', 'HIGH', 'NORMAL', 'LOW', 'BATCH'];
  const allPrioritiesExist = priorities.every(p => workerTypesContent.includes(`${p} = '${p.toLowerCase()}'`));
  addTestResult('모든 우선순위 레벨 정의', allPrioritiesExist,
    !allPrioritiesExist ? '일부 우선순위 레벨이 누락됨' : '');
  
  // calculateMessagePriorityScore 함수 존재 확인
  const hasCalculateFunction = workerTypesContent.includes('calculateMessagePriorityScore');
  addTestResult('우선순위 점수 계산 함수 존재', hasCalculateFunction,
    !hasCalculateFunction ? 'calculateMessagePriorityScore 함수가 정의되지 않음' : '');
  
  // getDefaultMessagePriority 함수 존재 확인
  const hasDefaultFunction = workerTypesContent.includes('getDefaultMessagePriority');
  addTestResult('기본 우선순위 함수 존재', hasDefaultFunction,
    !hasDefaultFunction ? 'getDefaultMessagePriority 함수가 정의되지 않음' : '');
  
  // WorkerMessage 인터페이스에 priority 필드 확인
  const hasPriorityField = workerTypesContent.includes('priority?: MessagePriority');
  addTestResult('WorkerMessage에 priority 필드 존재', hasPriorityField,
    !hasPriorityField ? 'WorkerMessage 인터페이스에 priority 필드가 없음' : '');
  
} catch (error) {
  addTestResult('타입 파일 읽기', false, `파일 읽기 실패: ${error.message}`);
}

// 2. Worker Thread Manager 파일 확인
try {
  const managerPath = path.join(__dirname, '..', 'src', 'services', 'workerThreadManager.ts');
  const managerContent = readFileSync(managerPath, 'utf8');
  
  // PriorityMessageQueueItem 인터페이스 존재 확인
  const hasPriorityQueueItem = managerContent.includes('interface PriorityMessageQueueItem');
  addTestResult('우선순위 큐 항목 인터페이스 존재', hasPriorityQueueItem,
    !hasPriorityQueueItem ? 'PriorityMessageQueueItem 인터페이스가 정의되지 않음' : '');
  
  // BatchProcessingSystem 인터페이스 존재 확인
  const hasBatchSystem = managerContent.includes('interface BatchProcessingSystem');
  addTestResult('배치 처리 시스템 인터페이스 존재', hasBatchSystem,
    !hasBatchSystem ? 'BatchProcessingSystem 인터페이스가 정의되지 않음' : '');
  
  // handleBatchMessage 함수 존재 확인
  const hasBatchHandler = managerContent.includes('handleBatchMessage');
  addTestResult('배치 메시지 처리 함수 존재', hasBatchHandler,
    !hasBatchHandler ? 'handleBatchMessage 함수가 정의되지 않음' : '');
  
  // flushBatchMessages 함수 존재 확인
  const hasFlushFunction = managerContent.includes('flushBatchMessages');
  addTestResult('배치 메시지 플러시 함수 존재', hasFlushFunction,
    !hasFlushFunction ? 'flushBatchMessages 함수가 정의되지 않음' : '');
  
  // 우선순위별 타임아웃 함수 존재 확인
  const hasTimeoutFunction = managerContent.includes('getTimeoutByPriority');
  addTestResult('우선순위별 타임아웃 함수 존재', hasTimeoutFunction,
    !hasTimeoutFunction ? 'getTimeoutByPriority 함수가 정의되지 않음' : '');
  
} catch (error) {
  addTestResult('Worker Thread Manager 파일 읽기', false, `파일 읽기 실패: ${error.message}`);
}

// 3. Worker 파일 확인
try {
  const workerPath = path.join(__dirname, '..', 'src', 'workers', 'm4ProcessWorker.ts');
  const workerContent = readFileSync(workerPath, 'utf8');
  
  // MessagePriority import 확인
  const hasMessagePriorityImport = workerContent.includes('MessagePriority');
  addTestResult('Worker에서 MessagePriority import 존재', hasMessagePriorityImport,
    !hasMessagePriorityImport ? 'MessagePriority가 import되지 않음' : '');
  
  // 배치 우선순위 설정 확인
  const hasBatchPriority = workerContent.includes('MessagePriority.BATCH');
  addTestResult('진행률 업데이트에 배치 우선순위 설정', hasBatchPriority,
    !hasBatchPriority ? '진행률 업데이트에 배치 우선순위가 설정되지 않음' : '');
  
  // 에러 메시지 우선순위 설정 확인
  const hasUrgentPriority = workerContent.includes('MessagePriority.URGENT');
  addTestResult('에러 메시지에 긴급 우선순위 설정', hasUrgentPriority,
    !hasUrgentPriority ? '에러 메시지에 긴급 우선순위가 설정되지 않음' : '');
  
} catch (error) {
  addTestResult('Worker 파일 읽기', false, `파일 읽기 실패: ${error.message}`);
}

// 4. 컴파일 테스트
try {
  const { execSync } = require('child_process');
  execSync('npm run build:main', { stdio: 'pipe' });
  addTestResult('TypeScript 컴파일 성공', true);
} catch (error) {
  addTestResult('TypeScript 컴파일 성공', false, `컴파일 실패: ${error.message}`);
}

// 결과 출력
console.log('\n📊 MessagePriority 시스템 테스트 결과');
console.log('============================================');
console.log(`총 테스트: ${testResults.tests.length}`);
console.log(`✅ 성공: ${testResults.passed}`);
console.log(`❌ 실패: ${testResults.failed}`);
console.log(`📈 성공률: ${((testResults.passed / testResults.tests.length) * 100).toFixed(1)}%`);

// 테스트 결과 저장
const testOutputPath = path.join(__dirname, 'test-outputs', 'message-priority-test-report.json');
const { mkdirSync } = require('fs');
try {
  mkdirSync(path.dirname(testOutputPath), { recursive: true });
  require('fs').writeFileSync(testOutputPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 테스트 결과 저장: ${testOutputPath}`);
} catch (error) {
  console.warn(`⚠️  테스트 결과 저장 실패: ${error.message}`);
}

// 모든 테스트 성공 여부 확인
const allTestsPassed = testResults.failed === 0;
console.log(`\n🎉 MessagePriority 시스템 구현 ${allTestsPassed ? '완료' : '진행 중'}`);

if (!allTestsPassed) {
  console.log('\n🔧 실패한 테스트를 확인하고 수정해주세요.');
  process.exit(1);
}

console.log('\n✅ 모든 MessagePriority 시스템 테스트 통과!');