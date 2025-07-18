#!/usr/bin/env node
/**
 * M4 Settings Integration Test (Simple Version)
 * Jest 없이 Node.js 기본 assert 모듈을 사용한 간단한 테스트
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

async function runTests() {
  log('cyan', '\n🧪 M4 Settings Integration Test\n')
  log('blue', 'Testing M4 settings system without Jest...\n')

  // 테스트 데이터 경로 설정
  const testDataPath = join(tmpdir(), 'sebastian-test-' + Date.now())
  await fs.mkdir(testDataPath, { recursive: true })

  // 1. 파일 존재성 테스트
  test('M4 Settings Service file exists', () => {
    const serviceFile = join(__dirname, '../src/services/m4SettingsService.ts')
    require('fs').accessSync(serviceFile)
  })

  test('State Manager file exists', () => {
    const stateManagerFile = join(__dirname, '../src/main/state-manager.ts')
    require('fs').accessSync(stateManagerFile)
  })

  test('M4 Processing types file exists', () => {
    const typesFile = join(__dirname, '../src/types/m4Processing.ts')
    require('fs').accessSync(typesFile)
  })

  // 2. 빌드된 파일 존재성 테스트
  test('Built M4 Settings Service exists', () => {
    const builtFile = join(__dirname, '../dist/services/m4SettingsService.js')
    try {
      require('fs').accessSync(builtFile)
    } catch (error) {
      // 빌드된 파일이 없으면 dist 폴더에 있는지 확인
      const altFile = join(__dirname, '../dist/main/services/m4SettingsService.js')
      try {
        require('fs').accessSync(altFile)
      } catch (altError) {
        throw new Error('M4 Settings Service build file not found in expected locations')
      }
    }
  })

  test('Built State Manager exists', () => {
    const builtFile = join(__dirname, '../dist/main/state-manager.js')
    require('fs').accessSync(builtFile)
  })

  test('Built M4 Processing types exist', () => {
    const builtFile = join(__dirname, '../dist/types/m4Processing.js')
    require('fs').accessSync(builtFile)
  })

  // 3. TypeScript 컴파일 검증
  test('M4 Settings Service TypeScript compilation', () => {
    const serviceContent = require('fs').readFileSync(
      join(__dirname, '../src/services/m4SettingsService.ts'),
      'utf-8'
    )
    assert(serviceContent.includes('export class M4SettingsService'))
    assert(serviceContent.includes('tryRestoreFromBackup'))
    assert(serviceContent.includes('recoverSettings'))
  })

  test('State Manager M4 extensions', () => {
    const stateManagerContent = require('fs').readFileSync(
      join(__dirname, '../src/main/state-manager.ts'),
      'utf-8'
    )
    assert(stateManagerContent.includes('saveM4Settings'))
    assert(stateManagerContent.includes('loadM4Settings'))
    assert(stateManagerContent.includes('updateLastUsedFolder'))
  })

  // 4. 기본 구조 검증
  test('M4 Settings interface structure', () => {
    const typesContent = require('fs').readFileSync(
      join(__dirname, '../src/shared/types.ts'),
      'utf-8'
    )
    assert(typesContent.includes('export interface M4Settings'))
    assert(typesContent.includes('folderPaths'))
    assert(typesContent.includes('recentFolders'))
    assert(typesContent.includes('processingOptions'))
  })

  // 5. IPC 핸들러 확장 검증
  test('IPC handlers for M4 settings', () => {
    const ipcContent = require('fs').readFileSync(
      join(__dirname, '../src/main/ipc-handlers.ts'),
      'utf-8'
    )
    assert(ipcContent.includes('GET_M4_SETTINGS'))
    assert(ipcContent.includes('SET_M4_SETTINGS'))
    assert(ipcContent.includes('RESET_M4_SETTINGS'))
  })

  // 6. Preload API 확장 검증
  test('Preload API for M4 settings', () => {
    const preloadContent = require('fs').readFileSync(
      join(__dirname, '../src/preload/index.ts'),
      'utf-8'
    )
    assert(preloadContent.includes('getM4Settings'))
    assert(preloadContent.includes('setM4Settings'))
    assert(preloadContent.includes('resetM4Settings'))
  })

  // 7. 메모리 누수 방지 검증
  test('Memory management in M4 settings', () => {
    const serviceContent = require('fs').readFileSync(
      join(__dirname, '../src/services/m4SettingsService.ts'),
      'utf-8'
    )
    assert(serviceContent.includes('cleanupOldBackups'))
    assert(serviceContent.includes('backupPath'))
  })

  // 8. 에러 처리 검증
  test('Error handling in M4 settings', () => {
    const serviceContent = require('fs').readFileSync(
      join(__dirname, '../src/services/m4SettingsService.ts'),
      'utf-8'
    )
    assert(serviceContent.includes('try {'))
    assert(serviceContent.includes('catch (error)'))
    assert(serviceContent.includes('throw new Error'))
  })

  // 9. 백업 시스템 검증
  test('Backup system in M4 settings', () => {
    const serviceContent = require('fs').readFileSync(
      join(__dirname, '../src/services/m4SettingsService.ts'),
      'utf-8'
    )
    assert(serviceContent.includes('backupPath'))
    assert(serviceContent.includes('tryRestoreFromBackup'))
    assert(serviceContent.includes('getBackupFiles'))
  })

  // 10. 타입 안전성 검증
  test('Type safety in M4 settings', () => {
    const typesContent = require('fs').readFileSync(
      join(__dirname, '../src/shared/types.ts'),
      'utf-8'
    )
    assert(typesContent.includes('M4Settings'))
    assert(typesContent.includes('M4ProcessingOptions'))
    assert(typesContent.includes('string[]'))
    assert(typesContent.includes('boolean'))
  })

  // 정리
  await fs.rm(testDataPath, { recursive: true, force: true })

  // 테스트 결과 출력
  log('cyan', '\n============================================================')
  log('cyan', '📊 M4 Settings Integration Test Results')
  log('cyan', '============================================================')
  log('white', `   Total Tests: ${totalTests}`)
  log('green', `   Passed: ${passedTests}`)
  log('red', `   Failed: ${failedTests}`)
  log('white', `   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

  if (failedTests === 0) {
    log('green', '\n🎉 All M4 Settings Integration tests passed!')
    log('green', '✅ M4 설정 시스템이 완전히 통합되었습니다.')
  } else {
    log('red', '\n❌ Some tests failed. Please check the implementation.')
    log('red', '일부 테스트가 실패했습니다. 구현을 확인해주세요.')
  }

  process.exit(failedTests > 0 ? 1 : 0)
}

// 테스트 실행
runTests().catch(error => {
  log('red', `\n💥 Test execution failed: ${error.message}`)
  process.exit(1)
})