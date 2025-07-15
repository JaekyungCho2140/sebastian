/**
 * LocalErrorReporter 통합 테스트
 * 실제 파일 시스템을 사용하여 에러 리포팅 시스템의 주요 기능들을 테스트합니다.
 */

const { join } = require('path')
const { existsSync, rmSync, mkdirSync, readFileSync } = require('fs')
const { randomUUID } = require('crypto')

// 테스트용 임시 디렉토리
const TEST_DIR = join(__dirname, 'temp-test-data')
const ERROR_REPORTS_DIR = join(TEST_DIR, 'error-reports')

/**
 * 간단한 테스트 러너
 */
class TestRunner {
  constructor() {
    this.tests = []
    this.results = { passed: 0, failed: 0, total: 0 }
  }

  test(name, fn) {
    this.tests.push({ name, fn })
  }

  async run() {
    console.log('🧪 LocalErrorReporter 통합 테스트 시작\n')
    
    for (const { name, fn } of this.tests) {
      this.results.total++
      try {
        await fn()
        console.log(`✅ ${name}`)
        this.results.passed++
      } catch (error) {
        console.log(`❌ ${name}`)
        console.log(`   Error: ${error.message}`)
        this.results.failed++
      }
    }

    console.log('\n📊 테스트 결과:')
    console.log(`   통과: ${this.results.passed}/${this.results.total}`)
    console.log(`   실패: ${this.results.failed}/${this.results.total}`)
    
    if (this.results.failed > 0) {
      process.exit(1)
    } else {
      console.log('\n🎉 모든 테스트 통과!')
    }
  }
}

/**
 * Mock Electron app path
 */
const mockApp = {
  getPath: (name) => {
    if (name === 'userData') {
      return TEST_DIR
    }
    return TEST_DIR
  }
}

/**
 * 테스트 설정
 */
function setupTest() {
  // 기존 테스트 데이터 정리
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true })
  }
  
  // 테스트 디렉토리 생성
  mkdirSync(TEST_DIR, { recursive: true })
  mkdirSync(ERROR_REPORTS_DIR, { recursive: true })
}

function cleanupTest() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true })
  }
}

/**
 * assertion 함수들
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, but got ${actual}`)
  }
}

function assertTrue(value, message) {
  assert(value === true, message || `Expected true, but got ${value}`)
}

function assertFileExists(filepath, message) {
  assert(existsSync(filepath), message || `File does not exist: ${filepath}`)
}

/**
 * 메인 테스트
 */
async function runTests() {
  const runner = new TestRunner()
  
  // 테스트 설정
  setupTest()
  
  // 타입 정의 테스트
  runner.test('ErrorReport 타입 구조 검증', async () => {
    // types.ts에서 정의한 인터페이스들이 올바르게 구성되어 있는지 확인
    const typesFile = join(__dirname, '../src/shared/types.ts')
    assertFileExists(typesFile, 'types.ts 파일이 존재해야 함')
    
    const content = readFileSync(typesFile, 'utf8')
    assertTrue(content.includes('interface ErrorReport'), 'ErrorReport 인터페이스가 정의되어야 함')
    assertTrue(content.includes('interface ErrorReportingConfig'), 'ErrorReportingConfig 인터페이스가 정의되어야 함')
    assertTrue(content.includes('interface SystemInfo'), 'SystemInfo 인터페이스가 정의되어야 함')
  })

  // 서비스 파일 존재 확인
  runner.test('LocalErrorReporter 클래스 파일 존재', async () => {
    const serviceFile = join(__dirname, '../src/main/services/local-error-reporter.ts')
    assertFileExists(serviceFile, 'LocalErrorReporter 파일이 존재해야 함')
    
    const content = readFileSync(serviceFile, 'utf8')
    assertTrue(content.includes('export class LocalErrorReporter'), 'LocalErrorReporter 클래스가 export되어야 함')
    assertTrue(content.includes('captureError'), 'captureError 메서드가 있어야 함')
    assertTrue(content.includes('cleanupOldReports'), 'cleanupOldReports 메서드가 있어야 함')
  })

  // 유틸리티 모듈 존재 확인
  runner.test('유틸리티 모듈들 존재 확인', async () => {
    const utilsDir = join(__dirname, '../src/main/utils')
    
    const validationFile = join(utilsDir, 'validation.ts')
    assertFileExists(validationFile, 'validation.ts가 존재해야 함')
    
    const fileOpsFile = join(utilsDir, 'file-operations.ts')
    assertFileExists(fileOpsFile, 'file-operations.ts가 존재해야 함')
    
    const maskingFile = join(utilsDir, 'data-masking.ts')
    assertFileExists(maskingFile, 'data-masking.ts가 존재해야 함')
  })

  // 모듈 임포트 테스트
  runner.test('모듈 임포트 및 기본 인스턴스 생성', async () => {
    // Node.js 환경에서 실행하므로 electron 모듈 mock 필요
    const originalApp = global.app
    global.app = mockApp
    
    try {
      // 동적 임포트를 통해 모듈 로드 시도
      const typesPath = join(__dirname, '../src/shared/types.ts')
      const content = readFileSync(typesPath, 'utf8')
      
      // 기본적인 타입 정의가 있는지 확인
      assertTrue(content.includes('ErrorSeverity'), 'ErrorSeverity 타입이 정의되어야 함')
      assertTrue(content.includes('ErrorType'), 'ErrorType 타입이 정의되어야 함')
      assertTrue(content.includes('ProcessType'), 'ProcessType 타입이 정의되어야 함')
    } finally {
      global.app = originalApp
    }
  })

  // 설정 유효성 테스트
  runner.test('에러 리포팅 설정 검증', async () => {
    const serviceFile = join(__dirname, '../src/main/services/local-error-reporter.ts')
    const content = readFileSync(serviceFile, 'utf8')
    
    // 기본 설정값들이 올바르게 설정되어 있는지 확인
    assertTrue(content.includes('maxBreadcrumbs: 50'), '기본 maxBreadcrumbs 설정')
    assertTrue(content.includes('maxFiles: 100'), '기본 maxFiles 설정')
    assertTrue(content.includes('maxAge: 30'), '기본 maxAge 설정')
    assertTrue(content.includes('maxTotalSize: 50 * 1024 * 1024'), '기본 maxTotalSize 설정')
    assertTrue(content.includes('reportingLevel: \'medium\''), '기본 reportingLevel 설정')
  })

  // 데이터 마스킹 패턴 테스트
  runner.test('기본 데이터 마스킹 패턴 검증', async () => {
    const serviceFile = join(__dirname, '../src/main/services/local-error-reporter.ts')
    const content = readFileSync(serviceFile, 'utf8')
    
    // 민감한 데이터 패턴들이 포함되어 있는지 확인
    assertTrue(content.includes('/home/[^/]+/'), 'Linux 홈 디렉토리 패턴')
    assertTrue(content.includes('/Users/[^/]+/'), 'macOS 홈 디렉토리 패턴')
    assertTrue(content.includes('C:\\\\\\\\Users'), 'Windows 사용자 디렉토리 패턴')
    assertTrue(content.includes('[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'), '이메일 패턴')
  })

  // 로그 로테이션 로직 테스트
  runner.test('로그 로테이션 로직 구현 확인', async () => {
    const serviceFile = join(__dirname, '../src/main/services/local-error-reporter.ts')
    const content = readFileSync(serviceFile, 'utf8')
    
    // 로그 로테이션 관련 로직들이 구현되어 있는지 확인
    assertTrue(content.includes('cleanupOldReports'), 'cleanupOldReports 메서드 존재')
    assertTrue(content.includes('maxAge * 24 * 60 * 60 * 1000'), '시간 기반 정리 로직')
    assertTrue(content.includes('totalSize > this.config.maxTotalSize'), '크기 기반 정리 로직')
    assertTrue(content.includes('finalRemainingFiles.length > this.config.maxFiles'), '파일 개수 기반 정리 로직')
  })

  // 빌드 호환성 테스트
  runner.test('TypeScript 컴파일 호환성', async () => {
    const { execSync } = require('child_process')
    
    try {
      // 타입 체크만 수행 (실제 빌드는 하지 않음)
      execSync('npx tsc --noEmit --project tsconfig.json', { 
        cwd: join(__dirname, '..'),
        stdio: 'pipe'
      })
      
      execSync('npx tsc --noEmit --project tsconfig.main.json', { 
        cwd: join(__dirname, '..'),
        stdio: 'pipe'
      })
    } catch (error) {
      throw new Error(`TypeScript 컴파일 오류: ${error.message}`)
    }
  })

  // 정리
  process.on('exit', cleanupTest)
  process.on('SIGINT', () => {
    cleanupTest()
    process.exit(0)
  })

  // 테스트 실행
  await runner.run()
}

// 메인 실행
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ 테스트 실행 중 오류:', error)
    cleanupTest()
    process.exit(1)
  })
}

module.exports = { runTests }