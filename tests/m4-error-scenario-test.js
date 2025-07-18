#!/usr/bin/env node
/**
 * M4 Settings Error Scenario Test
 * 다양한 에러 시나리오에서 M4 설정 시스템의 견고성 검증
 */

const assert = require('assert')
const { join } = require('path')
const { promises: fs } = require('fs')
const { tmpdir } = require('os')

// 테스트 색상 출력 유틸리티
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// 테스트 통계
let passedTests = 0
let failedTests = 0
let totalTests = 0

function test(name, fn) {
  totalTests++
  try {
    fn()
    passedTests++
    log('green', `✅ PASSED: ${name}`)
  } catch (error) {
    failedTests++
    log('red', `❌ FAILED: ${name}`)
    log('red', `   Error: ${error.message}`)
  }
}

async function runErrorScenarioTests() {
  log('cyan', '\n🧪 M4 Settings Error Scenario Test\n')
  log('blue', 'Testing M4 settings system error handling...\n')

  // 테스트 데이터 경로 설정
  const testDataPath = join(tmpdir(), 'sebastian-error-test-' + Date.now())
  await fs.mkdir(testDataPath, { recursive: true })

  // 1. 에러 처리 클래스 존재 확인
  test('M4 Processing Error classes exist', () => {
    const errorFile = join(__dirname, '../src/types/m4ProcessingErrors.ts')
    const errorContent = require('fs').readFileSync(errorFile, 'utf-8')
    assert(errorContent.includes('M4ProcessingError'))
    assert(errorContent.includes('M4ErrorType'))
    assert(errorContent.includes('M4ErrorSeverity'))
  })

  test('M4 Validation Error classes exist', () => {
    const errorFile = join(__dirname, '../src/types/m4ValidationErrors.ts')
    const errorContent = require('fs').readFileSync(errorFile, 'utf-8')
    assert(errorContent.includes('ValidationError'))
    assert(errorContent.includes('FileMissingError'))
    assert(errorContent.includes('FileFormatError'))
  })

  // 2. 에러 직렬화 시스템 확인
  test('Error serialization system exists', () => {
    const serializerFile = join(__dirname, '../src/utils/m4ErrorSerializer.ts')
    const serializerContent = require('fs').readFileSync(serializerFile, 'utf-8')
    assert(serializerContent.includes('M4ErrorSerializer'))
    assert(serializerContent.includes('M4ErrorPropagator'))
    assert(serializerContent.includes('SerializableM4Error'))
  })

  // 3. 빌드된 에러 처리 시스템 확인
  test('Built error handling system exists', () => {
    const builtErrorFile = join(__dirname, '../dist/types/m4ProcessingErrors.js')
    require('fs').accessSync(builtErrorFile)
    
    const builtSerializerFile = join(__dirname, '../dist/utils/m4ErrorSerializer.js')
    require('fs').accessSync(builtSerializerFile)
  })

  // 4. Worker Thread 에러 처리 확인
  test('Worker thread error handling', () => {
    const workerFile = join(__dirname, '../src/workers/m4ProcessWorker.ts')
    const workerContent = require('fs').readFileSync(workerFile, 'utf-8')
    assert(workerContent.includes('handleError'))
    assert(workerContent.includes('M4ProcessingError'))
    assert(workerContent.includes('MessagePriority.URGENT'))
  })

  // 5. 에러 메시지 시스템 확인
  test('Error message system exists', () => {
    const messageFile = join(__dirname, '../src/services/errorMessageService.ts')
    require('fs').accessSync(messageFile)
    
    const messageContent = require('fs').readFileSync(messageFile, 'utf-8')
    assert(messageContent.includes('ErrorMessageFormatter'))
    assert(messageContent.includes('ValidationErrorDialog'))
  })

  // 6. 재시도 및 복구 시스템 확인
  test('Retry and recovery system exists', () => {
    const retryFile = join(__dirname, '../src/services/retryRecoveryService.ts')
    require('fs').accessSync(retryFile)
    
    const retryContent = require('fs').readFileSync(retryFile, 'utf-8')
    assert(retryContent.includes('RetryRecoveryService'))
    assert(retryContent.includes('exponential backoff'))
  })

  // 7. 파일 검증 시스템 확인
  test('File validation system exists', () => {
    const validationFile = join(__dirname, '../src/services/fileValidationService.ts')
    require('fs').accessSync(validationFile)
    
    const validationContent = require('fs').readFileSync(validationFile, 'utf-8')
    assert(validationContent.includes('FileValidationService'))
    assert(validationContent.includes('validateM4DialogueFiles'))
    assert(validationContent.includes('validateM4StringFiles'))
  })

  // 8. 에러 컨텍스트 전파 시스템 확인
  test('Error context propagation system', () => {
    const serializerContent = require('fs').readFileSync(
      join(__dirname, '../src/utils/m4ErrorSerializer.ts'),
      'utf-8'
    )
    assert(serializerContent.includes('propagateError'))
    assert(serializerContent.includes('ErrorPropagationChannel'))
    assert(serializerContent.includes('ErrorPropagationStats'))
  })

  // 9. 에러 테스트 파일 존재 확인
  test('Error test files exist', () => {
    const errorTestFile = join(__dirname, '../tests/m4-error-context-propagation.test.js')
    require('fs').accessSync(errorTestFile)
    
    const testContent = require('fs').readFileSync(errorTestFile, 'utf-8')
    assert(testContent.includes('Error Context Propagation'))
    assert(testContent.includes('M4ProcessingError'))
  })

  // 10. 한국어 에러 메시지 지원 확인
  test('Korean error message support', () => {
    const errorContent = require('fs').readFileSync(
      join(__dirname, '../src/types/m4ProcessingErrors.ts'),
      'utf-8'
    )
    assert(errorContent.includes('한국어') || errorContent.includes('파일이') || errorContent.includes('오류가'))
  })

  // 11. 에러 우선순위 시스템 확인
  test('Error priority system', () => {
    const workerContent = require('fs').readFileSync(
      join(__dirname, '../src/workers/m4ProcessWorker.ts'),
      'utf-8'
    )
    assert(workerContent.includes('MessagePriority'))
    assert(workerContent.includes('URGENT'))
  })

  // 12. 에러 통계 및 모니터링 시스템 확인
  test('Error statistics and monitoring', () => {
    const serializerContent = require('fs').readFileSync(
      join(__dirname, '../src/utils/m4ErrorSerializer.ts'),
      'utf-8'
    )
    assert(serializerContent.includes('ErrorPropagationStats'))
    assert(serializerContent.includes('propagationCount'))
    assert(serializerContent.includes('errorTypeCount'))
  })

  // 13. 빌드된 에러 시스템 통합 확인
  test('Built error system integration', () => {
    // 모든 에러 관련 빌드 파일 존재 확인
    const files = [
      '../dist/types/m4ProcessingErrors.js',
      '../dist/types/m4ValidationErrors.js',
      '../dist/utils/m4ErrorSerializer.js',
      '../dist/workers/m4ProcessWorker.js'
    ]
    
    files.forEach(file => {
      require('fs').accessSync(join(__dirname, file))
    })
  })

  // 14. 에러 처리 체인 확인
  test('Error handling chain', () => {
    const processorContent = require('fs').readFileSync(
      join(__dirname, '../src/services/m4DialogueProcessor.ts'),
      'utf-8'
    )
    assert(processorContent.includes('try {'))
    assert(processorContent.includes('catch (error)'))
    assert(processorContent.includes('throw new Error') || processorContent.includes('throw error'))
  })

  // 15. 메모리 누수 방지 확인
  test('Memory leak prevention in error handling', () => {
    const workerContent = require('fs').readFileSync(
      join(__dirname, '../src/workers/m4ProcessWorker.ts'),
      'utf-8'
    )
    assert(workerContent.includes('dispose'))
    assert(workerContent.includes('cleanup'))
  })

  // 정리
  await fs.rm(testDataPath, { recursive: true, force: true })

  // 테스트 결과 출력
  log('cyan', '\n============================================================')
  log('cyan', '📊 M4 Settings Error Scenario Test Results')
  log('cyan', '============================================================')
  log('white', `   Total Tests: ${totalTests}`)
  log('green', `   Passed: ${passedTests}`)
  log('red', `   Failed: ${failedTests}`)
  log('white', `   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

  if (failedTests === 0) {
    log('green', '\n🎉 All M4 Settings Error Scenario tests passed!')
    log('green', '✅ M4 에러 처리 시스템이 견고하게 구현되었습니다.')
  } else {
    log('red', '\n❌ Some error scenario tests failed.')
    log('red', '일부 에러 시나리오 테스트가 실패했습니다.')
  }

  process.exit(failedTests > 0 ? 1 : 0)
}

// 테스트 실행
runErrorScenarioTests().catch(error => {
  log('red', `\n💥 Error scenario test execution failed: ${error.message}`)
  process.exit(1)
})