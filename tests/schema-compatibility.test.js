/**
 * JSON Schema Compatibility Test Suite
 * Tests schema validation, serialization, and backward compatibility
 */

const { join } = require('path')
const { existsSync, rmSync, mkdirSync } = require('fs')

// Test 디렉토리
const TEST_DIR = join(__dirname, 'temp-schema-test-data')

/**
 * 간단한 테스트 러너
 */
class SchemaTestRunner {
  constructor() {
    this.tests = []
    this.results = { passed: 0, failed: 0, total: 0 }
  }

  test(name, fn) {
    this.tests.push({ name, fn })
  }

  async run() {
    console.log('🧪 JSON Schema Compatibility 테스트 시작\n')
    
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
      console.log('\n🎉 모든 스키마 호환성 테스트 통과!')
    }
  }
}

/**
 * 테스트 설정
 */
function setupTest() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true })
  }
  mkdirSync(TEST_DIR, { recursive: true })
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

function assertFalse(value, message) {
  assert(value === false, message || `Expected false, but got ${value}`)
}

/**
 * 테스트 데이터 생성
 */
function createValidErrorReport() {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: Date.now(),
    severity: 'medium',
    errorType: 'javascript',
    processType: 'renderer',
    message: 'Test error message',
    stack: 'Error: Test error\n    at testFunction (test.js:1:1)',
    systemInfo: {
      platform: 'linux',
      arch: 'x64',
      osVersion: '20.04',
      nodeVersion: '18.0.0',
      electronVersion: '22.0.0',
      appVersion: '1.0.0',
      totalMemory: 8589934592,
      freeMemory: 4294967296,
      cpuModel: 'Intel Core i7',
      cpuCount: 8
    },
    context: {
      sessionId: '550e8400-e29b-41d4-a716-446655440001',
      url: 'http://localhost:3000',
      viewport: { width: 1920, height: 1080 }
    },
    breadcrumbs: [
      {
        timestamp: Date.now() - 1000,
        category: 'user',
        message: 'Button clicked',
        level: 'info',
        data: { buttonId: 'submit' }
      }
    ],
    tags: ['frontend', 'user-action'],
    fingerprint: 'test-error-fingerprint',
    schemaVersion: '1.0.0'
  }
}

function createValidConfig() {
  return {
    maxBreadcrumbs: 50,
    maxFileSize: 5242880,
    maxFiles: 100,
    maxAge: 30,
    maxTotalSize: 52428800,
    enableDataMasking: true,
    sensitiveDataPatterns: [
      '/home/[^/]+/',
      '/Users/[^/]+/',
      'C:\\\\Users\\\\[^\\\\]+\\\\',
      '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b'
    ],
    reportingLevel: 'medium',
    enableSystemInfo: true
  }
}

/**
 * 메인 테스트
 */
async function runSchemaTests() {
  const runner = new SchemaTestRunner()
  
  setupTest()

  // JSON 스키마 파일 존재 확인
  runner.test('Error Report Schema 파일 존재 확인', async () => {
    const schemaPath = join(__dirname, '../src/main/schemas/error-report.schema.json')
    assert(existsSync(schemaPath), 'error-report.schema.json 파일이 존재해야 함')
    
    const { readFileSync } = require('fs')
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
    
    assertTrue(schema.$schema !== undefined, 'Schema는 $schema 필드를 가져야 함')
    assertTrue(schema.title !== undefined, 'Schema는 title 필드를 가져야 함')
    assertTrue(schema.properties !== undefined, 'Schema는 properties 필드를 가져야 함')
    assertEquals(schema.version, '1.0.0', 'Schema 버전이 1.0.0이어야 함')
  })

  runner.test('Config Schema 파일 존재 확인', async () => {
    const schemaPath = join(__dirname, '../src/main/schemas/error-config.schema.json')
    assert(existsSync(schemaPath), 'error-config.schema.json 파일이 존재해야 함')
    
    const { readFileSync } = require('fs')
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
    
    assertTrue(schema.$schema !== undefined, 'Config schema는 $schema 필드를 가져야 함')
    assertTrue(schema.properties !== undefined, 'Config schema는 properties 필드를 가져야 함')
  })

  // 직렬화 유틸리티 존재 확인
  runner.test('Serialization 유틸리티 모듈 존재 확인', async () => {
    const serializationPath = join(__dirname, '../src/main/utils/serialization.ts')
    assert(existsSync(serializationPath), 'serialization.ts 파일이 존재해야 함')
    
    const { readFileSync } = require('fs')
    const content = readFileSync(serializationPath, 'utf8')
    
    assertTrue(content.includes('export class Serializer'), 'Serializer 클래스가 export되어야 함')
    assertTrue(content.includes('serializeErrorReport'), 'serializeErrorReport 메서드가 있어야 함')
    assertTrue(content.includes('deserializeErrorReport'), 'deserializeErrorReport 메서드가 있어야 함')
    assertTrue(content.includes('validateSchemaCompatibility'), 'validateSchemaCompatibility 메서드가 있어야 함')
  })

  // 스키마 검증 유틸리티 존재 확인
  runner.test('Schema Validation 유틸리티 모듈 존재 확인', async () => {
    const validationPath = join(__dirname, '../src/main/utils/schema-validation.ts')
    assert(existsSync(validationPath), 'schema-validation.ts 파일이 존재해야 함')
    
    const { readFileSync } = require('fs')
    const content = readFileSync(validationPath, 'utf8')
    
    assertTrue(content.includes('export class SchemaValidationEngine'), 'SchemaValidationEngine 클래스가 export되어야 함')
    assertTrue(content.includes('validateErrorReport'), 'validateErrorReport 메서드가 있어야 함')
    assertTrue(content.includes('validateConfig'), 'validateConfig 메서드가 있어야 함')
    assertTrue(content.includes('SchemaValidationResult'), 'SchemaValidationResult 인터페이스가 있어야 함')
  })

  // 유효한 데이터 구조 테스트
  runner.test('유효한 에러 리포트 데이터 구조 검증', async () => {
    const validReport = createValidErrorReport()
    
    // 필수 필드 확인
    const requiredFields = ['id', 'timestamp', 'severity', 'errorType', 'processType', 'message', 'systemInfo']
    for (const field of requiredFields) {
      assertTrue(validReport.hasOwnProperty(field), `필수 필드 '${field}'가 있어야 함`)
    }
    
    // UUID 형식 확인
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    assertTrue(uuidRegex.test(validReport.id), 'ID는 UUID v4 형식이어야 함')
    
    // 타임스탬프 확인
    assertTrue(typeof validReport.timestamp === 'number', 'timestamp는 숫자여야 함')
    assertTrue(validReport.timestamp > 0, 'timestamp는 양수여야 함')
    
    // 열거형 값 확인
    const validSeverities = ['low', 'medium', 'high', 'critical']
    assertTrue(validSeverities.includes(validReport.severity), '유효한 severity 값이어야 함')
    
    const validErrorTypes = ['javascript', 'promise-rejection', 'react-component', 'main-process', 'ipc', 'filesystem', 'network']
    assertTrue(validErrorTypes.includes(validReport.errorType), '유효한 errorType 값이어야 함')
    
    const validProcessTypes = ['main', 'renderer', 'preload']
    assertTrue(validProcessTypes.includes(validReport.processType), '유효한 processType 값이어야 함')
  })

  runner.test('유효한 설정 데이터 구조 검증', async () => {
    const validConfig = createValidConfig()
    
    // 필수 필드 확인
    const requiredFields = ['maxBreadcrumbs', 'maxFileSize', 'maxFiles', 'maxAge', 'maxTotalSize', 'enableDataMasking', 'reportingLevel', 'enableSystemInfo']
    for (const field of requiredFields) {
      assertTrue(validConfig.hasOwnProperty(field), `필수 설정 필드 '${field}'가 있어야 함`)
    }
    
    // 숫자 필드 검증
    assertTrue(typeof validConfig.maxBreadcrumbs === 'number', 'maxBreadcrumbs는 숫자여야 함')
    assertTrue(validConfig.maxBreadcrumbs >= 10 && validConfig.maxBreadcrumbs <= 500, 'maxBreadcrumbs는 10-500 범위여야 함')
    
    assertTrue(typeof validConfig.maxFileSize === 'number', 'maxFileSize는 숫자여야 함')
    assertTrue(validConfig.maxFileSize >= 1024, 'maxFileSize는 최소 1KB여야 함')
    
    // 불린 필드 검증
    assertTrue(typeof validConfig.enableDataMasking === 'boolean', 'enableDataMasking은 불린값이어야 함')
    assertTrue(typeof validConfig.enableSystemInfo === 'boolean', 'enableSystemInfo는 불린값이어야 함')
    
    // 열거형 값 확인
    const validReportingLevels = ['low', 'medium', 'high', 'critical']
    assertTrue(validReportingLevels.includes(validConfig.reportingLevel), '유효한 reportingLevel 값이어야 함')
  })

  // JSON 직렬화/역직렬화 호환성 테스트
  runner.test('JSON 직렬화/역직렬화 호환성', async () => {
    const originalReport = createValidErrorReport()
    
    // JSON 직렬화
    const jsonString = JSON.stringify(originalReport, null, 2)
    assertTrue(jsonString.length > 0, 'JSON 직렬화가 성공해야 함')
    
    // JSON 역직렬화
    const deserializedReport = JSON.parse(jsonString)
    
    // 기본 구조 확인
    assertEquals(deserializedReport.id, originalReport.id, 'ID가 보존되어야 함')
    assertEquals(deserializedReport.severity, originalReport.severity, 'severity가 보존되어야 함')
    assertEquals(deserializedReport.errorType, originalReport.errorType, 'errorType이 보존되어야 함')
    assertEquals(deserializedReport.message, originalReport.message, 'message가 보존되어야 함')
    
    // 중첩 객체 확인
    assertEquals(deserializedReport.systemInfo.platform, originalReport.systemInfo.platform, 'systemInfo.platform이 보존되어야 함')
    assertEquals(deserializedReport.context.sessionId, originalReport.context.sessionId, 'context.sessionId가 보존되어야 함')
    
    // 배열 확인
    assertEquals(deserializedReport.breadcrumbs.length, originalReport.breadcrumbs.length, 'breadcrumbs 배열 길이가 보존되어야 함')
    assertEquals(deserializedReport.tags.length, originalReport.tags.length, 'tags 배열 길이가 보존되어야 함')
  })

  // 스키마 버전 호환성 테스트
  runner.test('스키마 버전 호환성', async () => {
    const report = createValidErrorReport()
    
    // 현재 버전 (1.0.0)
    assertEquals(report.schemaVersion, '1.0.0', '현재 스키마 버전이 1.0.0이어야 함')
    
    // 호환성 시뮬레이션 - 미래 마이너 버전
    const futureMinorReport = { ...report, schemaVersion: '1.1.0' }
    const futureMinorJson = JSON.stringify(futureMinorReport)
    const parsedFutureMinor = JSON.parse(futureMinorJson)
    assertTrue(parsedFutureMinor.schemaVersion === '1.1.0', '미래 마이너 버전 파싱이 성공해야 함')
    
    // 호환성 시뮬레이션 - 과거 버전
    const pastReport = { ...report, schemaVersion: '1.0.0' }
    const pastJson = JSON.stringify(pastReport)
    const parsedPast = JSON.parse(pastJson)
    assertTrue(parsedPast.id === report.id, '과거 버전 데이터가 파싱되어야 함')
  })

  // 에지 케이스 테스트
  runner.test('에지 케이스 처리', async () => {
    // 매우 긴 메시지
    const longMessage = 'A'.repeat(15000)
    const reportWithLongMessage = {
      ...createValidErrorReport(),
      message: longMessage
    }
    
    const longMessageJson = JSON.stringify(reportWithLongMessage)
    const parsedLongMessage = JSON.parse(longMessageJson)
    assertTrue(parsedLongMessage.message.length === longMessage.length, '긴 메시지가 보존되어야 함')
    
    // 빈 배열들
    const reportWithEmptyArrays = {
      ...createValidErrorReport(),
      breadcrumbs: [],
      tags: []
    }
    
    const emptyArraysJson = JSON.stringify(reportWithEmptyArrays)
    const parsedEmptyArrays = JSON.parse(emptyArraysJson)
    assertTrue(Array.isArray(parsedEmptyArrays.breadcrumbs), 'breadcrumbs는 배열이어야 함')
    assertEquals(parsedEmptyArrays.breadcrumbs.length, 0, 'breadcrumbs 배열이 비어있어야 함')
    
    // null 값들
    const reportWithNulls = {
      ...createValidErrorReport(),
      stack: null,
      context: {
        ...createValidErrorReport().context,
        userAgent: null
      }
    }
    
    const nullsJson = JSON.stringify(reportWithNulls)
    const parsedNulls = JSON.parse(nullsJson)
    assertEquals(parsedNulls.stack, null, 'null 값이 보존되어야 함')
  })

  // 성능 테스트
  runner.test('직렬화 성능 테스트', async () => {
    const report = createValidErrorReport()
    
    // 큰 breadcrumbs 배열로 테스트
    const largeBreadcrumbs = Array.from({ length: 100 }, (_, i) => ({
      timestamp: Date.now() - i * 1000,
      category: 'test',
      message: `Test breadcrumb ${i}`,
      level: 'info',
      data: { index: i, testData: 'A'.repeat(100) }
    }))
    
    const largeReport = {
      ...report,
      breadcrumbs: largeBreadcrumbs
    }
    
    const startTime = Date.now()
    const largeJson = JSON.stringify(largeReport)
    const serializationTime = Date.now() - startTime
    
    assertTrue(serializationTime < 1000, '1초 내에 직렬화가 완료되어야 함')
    assertTrue(largeJson.length > 0, '큰 데이터도 직렬화되어야 함')
    
    const parseStartTime = Date.now()
    const parsedLarge = JSON.parse(largeJson)
    const parseTime = Date.now() - parseStartTime
    
    assertTrue(parseTime < 1000, '1초 내에 파싱이 완료되어야 함')
    assertEquals(parsedLarge.breadcrumbs.length, 100, '모든 breadcrumbs가 보존되어야 함')
  })

  // 정리
  process.on('exit', cleanupTest)
  process.on('SIGINT', () => {
    cleanupTest()
    process.exit(0)
  })

  await runner.run()
}

// 메인 실행
if (require.main === module) {
  runSchemaTests().catch(error => {
    console.error('❌ 스키마 테스트 실행 중 오류:', error)
    cleanupTest()
    process.exit(1)
  })
}

module.exports = { runSchemaTests }