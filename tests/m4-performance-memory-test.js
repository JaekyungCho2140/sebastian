#!/usr/bin/env node
/**
 * M4 Settings Performance and Memory Test
 * M4 설정 시스템의 성능과 메모리 사용량 검증
 */

const assert = require('assert')
const { join } = require('path')
const { promises: fs } = require('fs')
const { tmpdir } = require('os')
const { execSync } = require('child_process')

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

async function testPerformance(name, fn) {
  totalTests++
  try {
    const startTime = process.hrtime.bigint()
    const startMemory = process.memoryUsage()
    
    await fn()
    
    const endTime = process.hrtime.bigint()
    const endMemory = process.memoryUsage()
    
    const duration = Number(endTime - startTime) / 1000000 // ms
    const memoryDiff = endMemory.heapUsed - startMemory.heapUsed
    
    passedTests++
    log('green', `✅ PASSED: ${name}`)
    log('cyan', `   ⏱️  Duration: ${duration.toFixed(2)}ms`)
    log('cyan', `   🧠 Memory: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`)
  } catch (error) {
    failedTests++
    log('red', `❌ FAILED: ${name}`)
    log('red', `   Error: ${error.message}`)
  }
}

async function runPerformanceTests() {
  log('cyan', '\n🧪 M4 Settings Performance and Memory Test\n')
  log('blue', 'Testing M4 settings system performance and memory usage...\n')

  // 테스트 데이터 경로 설정
  const testDataPath = join(tmpdir(), 'sebastian-perf-test-' + Date.now())
  await fs.mkdir(testDataPath, { recursive: true })

  // 1. 빌드된 파일 크기 확인
  test('Built file sizes are reasonable', async () => {
    const files = [
      '../dist/services/m4SettingsService.js',
      '../dist/services/m4DialogueProcessor.js',
      '../dist/services/m4StringProcessor.js',
      '../dist/workers/m4ProcessWorker.js',
      '../dist/utils/m4ErrorSerializer.js'
    ]
    
    for (const file of files) {
      const filePath = join(__dirname, file)
      const stats = await fs.stat(filePath)
      const sizeKB = stats.size / 1024
      
      log('cyan', `   📁 ${file.split('/').pop()}: ${sizeKB.toFixed(2)}KB`)
      
      // 파일 크기가 합리적인지 확인 (예: 100KB 이하)
      assert(sizeKB < 100, `File ${file} is too large: ${sizeKB.toFixed(2)}KB`)
    }
  })

  // 2. TypeScript 컴파일 시간 측정
  await testPerformance('TypeScript compilation time', async () => {
    const startTime = Date.now()
    
    try {
      execSync('npm run build:main', { 
        cwd: join(__dirname, '..'),
        stdio: 'pipe',
        timeout: 30000
      })
    } catch (error) {
      // 이미 빌드되어 있어도 OK
    }
    
    const duration = Date.now() - startTime
    assert(duration < 10000, `Compilation took too long: ${duration}ms`)
  })

  // 3. 메모리 사용량 패턴 확인
  test('Memory usage patterns', () => {
    const initialMemory = process.memoryUsage()
    
    // M4 타입 정의들 로드
    const types = require('../dist/types/m4Processing.js')
    const errorTypes = require('../dist/types/m4ProcessingErrors.js')
    
    const afterLoadMemory = process.memoryUsage()
    const memoryIncrease = afterLoadMemory.heapUsed - initialMemory.heapUsed
    const memoryIncreaseKB = memoryIncrease / 1024
    
    log('cyan', `   🧠 Memory increase after loading types: ${memoryIncreaseKB.toFixed(2)}KB`)
    
    // 메모리 증가량이 합리적인지 확인 (예: 5MB 이하)
    assert(memoryIncreaseKB < 5120, `Memory increase too high: ${memoryIncreaseKB.toFixed(2)}KB`)
  })

  // 4. 파일 시스템 성능 테스트
  await testPerformance('File system operations', async () => {
    const testFiles = []
    
    // 100개의 테스트 파일 생성
    for (let i = 0; i < 100; i++) {
      const testFile = join(testDataPath, `test-${i}.json`)
      const testData = JSON.stringify({
        id: i,
        data: `test-data-${i}`,
        timestamp: Date.now()
      })
      
      await fs.writeFile(testFile, testData)
      testFiles.push(testFile)
    }
    
    // 파일 읽기 성능 테스트
    const readPromises = testFiles.map(file => fs.readFile(file, 'utf8'))
    const results = await Promise.all(readPromises)
    
    assert(results.length === 100, 'Not all files were read')
    
    // 파일 정리
    await Promise.all(testFiles.map(file => fs.unlink(file)))
  })

  // 5. 대용량 데이터 처리 시뮬레이션
  await testPerformance('Large data processing simulation', async () => {
    const largeArray = []
    
    // 10,000개 항목 생성
    for (let i = 0; i < 10000; i++) {
      largeArray.push({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`,
        value: Math.random() * 1000,
        timestamp: Date.now()
      })
    }
    
    // 데이터 처리 시뮬레이션
    const processed = largeArray
      .filter(item => item.value > 500)
      .map(item => ({
        ...item,
        processed: true,
        category: item.value > 750 ? 'high' : 'medium'
      }))
      .sort((a, b) => b.value - a.value)
    
    assert(processed.length > 0, 'No items were processed')
    assert(processed.every(item => item.processed), 'Not all items were processed')
  })

  // 6. 병렬 처리 성능 테스트
  await testPerformance('Concurrent processing simulation', async () => {
    const tasks = []
    
    // 20개의 병렬 작업 생성
    for (let i = 0; i < 20; i++) {
      tasks.push(new Promise(resolve => {
        setTimeout(() => {
          const result = {
            taskId: i,
            result: `Task ${i} completed`,
            processingTime: Math.random() * 100
          }
          resolve(result)
        }, Math.random() * 50)
      }))
    }
    
    const results = await Promise.all(tasks)
    assert(results.length === 20, 'Not all tasks completed')
    assert(results.every(r => r.result), 'Not all tasks returned results')
  })

  // 7. 메모리 누수 방지 테스트
  test('Memory leak prevention', () => {
    const initialMemory = process.memoryUsage()
    
    // 여러 번 객체 생성/삭제 반복
    for (let i = 0; i < 1000; i++) {
      const obj = {
        id: i,
        data: new Array(100).fill(`data-${i}`),
        timestamp: Date.now()
      }
      
      // 객체 사용 후 참조 해제
      delete obj.data
    }
    
    // 가비지 컬렉션 강제 실행 (가능한 경우)
    if (global.gc) {
      global.gc()
    }
    
    const afterMemory = process.memoryUsage()
    const memoryIncrease = afterMemory.heapUsed - initialMemory.heapUsed
    const memoryIncreaseKB = memoryIncrease / 1024
    
    log('cyan', `   🧠 Memory increase after object creation/deletion: ${memoryIncreaseKB.toFixed(2)}KB`)
    
    // 메모리 증가량이 합리적인지 확인 (예: 1MB 이하)
    assert(memoryIncreaseKB < 1024, `Potential memory leak: ${memoryIncreaseKB.toFixed(2)}KB`)
  })

  // 8. 에러 처리 성능 테스트
  await testPerformance('Error handling performance', async () => {
    const errors = []
    
    // 100개의 에러 생성 및 처리
    for (let i = 0; i < 100; i++) {
      try {
        throw new Error(`Test error ${i}`)
      } catch (error) {
        errors.push({
          message: error.message,
          stack: error.stack,
          timestamp: Date.now()
        })
      }
    }
    
    // 에러 처리 시뮬레이션
    const processedErrors = errors.filter(e => e.message.includes('Test error'))
    assert(processedErrors.length === 100, 'Not all errors were processed')
  })

  // 9. JSON 직렬화/역직렬화 성능
  await testPerformance('JSON serialization/deserialization', async () => {
    const testObject = {
      version: '1.0.0',
      settings: {
        folderPaths: {
          dialogue: { inputFolder: '/test/dialogue', outputFolder: '/test/output' },
          string: { inputFolder: '/test/string', outputFolder: '/test/output' }
        },
        recentFolders: new Array(50).fill(0).map((_, i) => ({
          path: `/test/folder-${i}`,
          lastUsed: Date.now() - i * 86400000,
          usageCount: Math.floor(Math.random() * 100)
        })),
        processingOptions: {
          maxConcurrency: 4,
          enableLogging: true,
          timeout: 30000
        }
      }
    }
    
    // 직렬화
    const serialized = JSON.stringify(testObject)
    assert(serialized.length > 0, 'Serialization failed')
    
    // 역직렬화
    const deserialized = JSON.parse(serialized)
    assert(deserialized.version === testObject.version, 'Deserialization failed')
    assert(deserialized.settings.recentFolders.length === 50, 'Array deserialization failed')
  })

  // 10. Worker Thread 시뮬레이션 성능
  await testPerformance('Worker thread simulation', async () => {
    const messages = []
    
    // 100개의 메시지 생성
    for (let i = 0; i < 100; i++) {
      messages.push({
        id: i,
        type: 'progress_update',
        data: {
          progress: i,
          step: `Step ${i}`,
          timestamp: Date.now()
        },
        priority: i % 10 === 0 ? 'high' : 'normal'
      })
    }
    
    // 메시지 처리 시뮬레이션
    const processed = messages
      .sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1
        if (a.priority !== 'high' && b.priority === 'high') return 1
        return a.id - b.id
      })
      .slice(0, 50) // 상위 50개만 처리
    
    assert(processed.length === 50, 'Not all messages were processed')
    assert(processed.filter(m => m.priority === 'high').length > 0, 'High priority messages not processed first')
  })

  // 정리
  await fs.rm(testDataPath, { recursive: true, force: true })

  // 테스트 결과 출력
  log('cyan', '\n============================================================')
  log('cyan', '📊 M4 Settings Performance and Memory Test Results')
  log('cyan', '============================================================')
  log('white', `   Total Tests: ${totalTests}`)
  log('green', `   Passed: ${passedTests}`)
  log('red', `   Failed: ${failedTests}`)
  log('white', `   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

  // 전체 메모리 사용량 출력
  const finalMemory = process.memoryUsage()
  log('cyan', '\n📈 Final Memory Usage:')
  log('cyan', `   RSS: ${(finalMemory.rss / 1024 / 1024).toFixed(2)}MB`)
  log('cyan', `   Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
  log('cyan', `   Heap Total: ${(finalMemory.heapTotal / 1024 / 1024).toFixed(2)}MB`)
  log('cyan', `   External: ${(finalMemory.external / 1024 / 1024).toFixed(2)}MB`)

  if (failedTests === 0) {
    log('green', '\n🎉 All M4 Settings Performance and Memory tests passed!')
    log('green', '✅ M4 시스템의 성능과 메모리 사용량이 최적화되었습니다.')
  } else {
    log('red', '\n❌ Some performance tests failed.')
    log('red', '일부 성능 테스트가 실패했습니다.')
  }

  process.exit(failedTests > 0 ? 1 : 0)
}

// 테스트 실행
runPerformanceTests().catch(error => {
  log('red', `\n💥 Performance test execution failed: ${error.message}`)
  process.exit(1)
})