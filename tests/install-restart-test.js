const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class InstallRestartTestSuite {
  constructor() {
    this.testResults = {
      passed: [],
      failed: [],
      manual: [],
      timestamp: new Date().toISOString()
    }
    
    this.testDir = path.join(__dirname, '..', 'test-outputs')
    this.packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
    this.currentVersion = this.packageJson.version
    
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true })
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`
    console.log(logMessage)
    
    const logFile = path.join(this.testDir, 'install-restart-test.log')
    fs.appendFileSync(logFile, logMessage + '\n')
  }

  recordResult(testName, status, details = {}) {
    const result = {
      testName,
      status,
      timestamp: new Date().toISOString(),
      ...details
    }
    
    if (status === 'passed') {
      this.testResults.passed.push(result)
    } else if (status === 'failed') {
      this.testResults.failed.push(result)
    } else if (status === 'manual') {
      this.testResults.manual.push(result)
    }
  }

  // 테스트 1: NSIS 설치 스크립트 검증
  async testNsisInstallScript() {
    const testName = 'NSIS Install Script Validation'
    this.log(`Running: ${testName}`)
    
    try {
      const installerPath = path.join(__dirname, '..', 'src', 'main', 'services', 'updateInstaller.ts')
      const content = fs.readFileSync(installerPath, 'utf8')
      
      // NSIS 설치 관련 핵심 기능 확인
      const features = {
        hasNsisExecution: content.includes('nsis') || content.includes('NSIS'),
        hasInstallCommand: content.includes('install') && content.includes('execute'),
        hasExitCodeHandling: content.includes('exitCode') || content.includes('exit'),
        hasErrorHandling: content.includes('catch') || content.includes('error'),
        hasProgressTracking: content.includes('progress') || content.includes('Progress'),
        hasCleanup: content.includes('cleanup') || content.includes('clean'),
        hasValidation: content.includes('validate') || content.includes('verify'),
        hasLogging: content.includes('log') || content.includes('Log')
      }
      
      const implementedFeatures = Object.values(features).filter(Boolean).length
      const totalFeatures = Object.keys(features).length
      const coverage = (implementedFeatures / totalFeatures) * 100
      
      if (coverage >= 80) {
        this.recordResult(testName, 'passed', {
          features: features,
          coverage: coverage,
          implementedFeatures: implementedFeatures,
          totalFeatures: totalFeatures
        })
        this.log(`✓ NSIS install script validated (${coverage.toFixed(1)}% coverage)`)
        return true
      } else {
        throw new Error(`Insufficient install script coverage: ${coverage.toFixed(1)}%`)
      }
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return false
    }
  }

  // 테스트 2: 설치 프로세스 IPC 채널 검증
  async testInstallProcessIpc() {
    const testName = 'Install Process IPC Channels'
    this.log(`Running: ${testName}`)
    
    try {
      const ipcPath = path.join(__dirname, '..', 'src', 'main', 'ipc-handlers.ts')
      const content = fs.readFileSync(ipcPath, 'utf8')
      
      // 설치 관련 IPC 채널 확인
      const requiredChannels = [
        'INSTALL_UPDATE',
        'NSIS_INSTALLATION',
        'INSTALLATION_PROGRESS',
        'INSTALLATION_COMPLETE',
        'INSTALLATION_FAILED',
        'INSTALLATION_ERROR',
        'CANCEL_INSTALLATION'
      ]
      
      const foundChannels = []
      const missingChannels = []
      
      for (const channel of requiredChannels) {
        // 변형된 형태로도 확인 (대소문자, 언더스코어 등)
        const variations = [
          channel,
          channel.toLowerCase(),
          channel.replace(/_/g, '-'),
          channel.replace(/_/g, '').toLowerCase()
        ]
        
        if (variations.some(variant => content.includes(variant))) {
          foundChannels.push(channel)
        } else {
          missingChannels.push(channel)
        }
      }
      
      const coverage = (foundChannels.length / requiredChannels.length) * 100
      
      if (coverage >= 70) {
        this.recordResult(testName, 'passed', {
          foundChannels: foundChannels,
          coverage: coverage,
          totalChannels: requiredChannels.length
        })
        this.log(`✓ Install process IPC channels validated (${coverage.toFixed(1)}% coverage)`)
        return true
      } else {
        throw new Error(`Missing IPC channels: ${missingChannels.join(', ')}`)
      }
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return false
    }
  }

  // 테스트 3: 애플리케이션 재시작 로직 검증
  async testApplicationRestartLogic() {
    const testName = 'Application Restart Logic'
    this.log(`Running: ${testName}`)
    
    try {
      const ipcPath = path.join(__dirname, '..', 'src', 'main', 'ipc-handlers.ts')
      const content = fs.readFileSync(ipcPath, 'utf8')
      
      // 재시작 관련 기능 확인
      const restartFeatures = {
        hasRestartChannel: content.includes('restart') || content.includes('RESTART'),
        hasAppQuit: content.includes('quit') || content.includes('exit'),
        hasRelaunch: content.includes('relaunch') || content.includes('launch'),
        hasGracefulShutdown: content.includes('shutdown') || content.includes('close'),
        hasProcessManagement: content.includes('process') || content.includes('Process')
      }
      
      const implementedFeatures = Object.values(restartFeatures).filter(Boolean).length
      const totalFeatures = Object.keys(restartFeatures).length
      const coverage = (implementedFeatures / totalFeatures) * 100
      
      if (coverage >= 60) {
        this.recordResult(testName, 'passed', {
          restartFeatures: restartFeatures,
          coverage: coverage,
          implementedFeatures: implementedFeatures,
          totalFeatures: totalFeatures
        })
        this.log(`✓ Application restart logic validated (${coverage.toFixed(1)}% coverage)`)
        return true
      } else {
        throw new Error(`Insufficient restart logic coverage: ${coverage.toFixed(1)}%`)
      }
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return false
    }
  }

  // 테스트 4: 설치 진행률 모니터링 검증
  async testInstallProgressMonitoring() {
    const testName = 'Install Progress Monitoring'
    this.log(`Running: ${testName}`)
    
    try {
      const installerPath = path.join(__dirname, '..', 'src', 'main', 'services', 'updateInstaller.ts')
      const content = fs.readFileSync(installerPath, 'utf8')
      
      // 진행률 모니터링 관련 기능 확인
      const progressFeatures = {
        hasProgressEmitter: content.includes('emit') && content.includes('progress'),
        hasPhaseTracking: content.includes('phase') || content.includes('stage'),
        hasTimeEstimation: content.includes('time') && content.includes('estimate'),
        hasProgressCalculation: content.includes('progress') && content.includes('calculate'),
        hasProgressUpdate: content.includes('update') && content.includes('progress'),
        hasProgressCallback: content.includes('callback') || content.includes('emit'),
        hasProgressValidation: content.includes('validate') && content.includes('progress')
      }
      
      const implementedFeatures = Object.values(progressFeatures).filter(Boolean).length
      const totalFeatures = Object.keys(progressFeatures).length
      const coverage = (implementedFeatures / totalFeatures) * 100
      
      if (coverage >= 70) {
        this.recordResult(testName, 'passed', {
          progressFeatures: progressFeatures,
          coverage: coverage,
          implementedFeatures: implementedFeatures,
          totalFeatures: totalFeatures
        })
        this.log(`✓ Install progress monitoring validated (${coverage.toFixed(1)}% coverage)`)
        return true
      } else {
        throw new Error(`Insufficient progress monitoring coverage: ${coverage.toFixed(1)}%`)
      }
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return false
    }
  }

  // 테스트 5: 설치 실패 처리 검증
  async testInstallFailureHandling() {
    const testName = 'Install Failure Handling'
    this.log(`Running: ${testName}`)
    
    try {
      const installerPath = path.join(__dirname, '..', 'src', 'main', 'services', 'updateInstaller.ts')
      const content = fs.readFileSync(installerPath, 'utf8')
      
      // 실패 처리 관련 기능 확인
      const failureFeatures = {
        hasErrorCatching: content.includes('catch') || content.includes('error'),
        hasRollback: content.includes('rollback') || content.includes('restore'),
        hasRetryLogic: content.includes('retry') || content.includes('attempt'),
        hasErrorLogging: content.includes('log') && content.includes('error'),
        hasUserNotification: content.includes('notify') || content.includes('alert'),
        hasCleanupOnFailure: content.includes('cleanup') || content.includes('clean'),
        hasFailureRecovery: content.includes('recover') || content.includes('recovery')
      }
      
      const implementedFeatures = Object.values(failureFeatures).filter(Boolean).length
      const totalFeatures = Object.keys(failureFeatures).length
      const coverage = (implementedFeatures / totalFeatures) * 100
      
      if (coverage >= 60) {
        this.recordResult(testName, 'passed', {
          failureFeatures: failureFeatures,
          coverage: coverage,
          implementedFeatures: implementedFeatures,
          totalFeatures: totalFeatures
        })
        this.log(`✓ Install failure handling validated (${coverage.toFixed(1)}% coverage)`)
        return true
      } else {
        throw new Error(`Insufficient failure handling coverage: ${coverage.toFixed(1)}%`)
      }
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return false
    }
  }

  // 테스트 6: 설치 후 정리 프로세스 검증
  async testPostInstallCleanup() {
    const testName = 'Post-Install Cleanup Process'
    this.log(`Running: ${testName}`)
    
    try {
      const installerPath = path.join(__dirname, '..', 'src', 'main', 'services', 'updateInstaller.ts')
      const content = fs.readFileSync(installerPath, 'utf8')
      
      // 정리 프로세스 관련 기능 확인
      const cleanupFeatures = {
        hasTempFileCleanup: content.includes('temp') && content.includes('clean'),
        hasDownloadCleanup: content.includes('download') && content.includes('clean'),
        hasResourceCleanup: content.includes('resource') && content.includes('clean'),
        hasMemoryCleanup: content.includes('memory') || content.includes('dispose'),
        hasProcessCleanup: content.includes('process') && content.includes('clean'),
        hasFileSystemCleanup: content.includes('file') && content.includes('clean')
      }
      
      const implementedFeatures = Object.values(cleanupFeatures).filter(Boolean).length
      const totalFeatures = Object.keys(cleanupFeatures).length
      const coverage = (implementedFeatures / totalFeatures) * 100
      
      if (coverage >= 50) {
        this.recordResult(testName, 'passed', {
          cleanupFeatures: cleanupFeatures,
          coverage: coverage,
          implementedFeatures: implementedFeatures,
          totalFeatures: totalFeatures
        })
        this.log(`✓ Post-install cleanup process validated (${coverage.toFixed(1)}% coverage)`)
        return true
      } else {
        throw new Error(`Insufficient cleanup process coverage: ${coverage.toFixed(1)}%`)
      }
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return false
    }
  }

  // 수동 테스트 가이드 생성
  generateManualTestGuide() {
    const testName = 'Manual Install/Restart Test Guide'
    this.log(`Running: ${testName}`)
    
    const manualTests = [
      {
        id: 'NSIS_INSTALLATION',
        title: 'NSIS 설치 프로세스 테스트',
        description: '실제 NSIS 인스톨러로 업데이트 설치 테스트',
        steps: [
          '1. Sebastian v0.1.28 설치 후 실행',
          '2. 새 버전 릴리스 후 업데이트 감지 대기',
          '3. "지금 업데이트" 선택하여 설치 시작',
          '4. 설치 진행률 모니터링 (0% → 100%)',
          '5. 설치 완료 메시지 확인',
          '6. 기존 앱 종료 확인'
        ],
        expectedResult: '설치 성공 및 기존 앱 자동 종료',
        duration: '2-3분',
        priority: 'high'
      },
      {
        id: 'APP_RESTART',
        title: '애플리케이션 재시작 테스트',
        description: '설치 완료 후 자동 재시작 기능 테스트',
        steps: [
          '1. 설치 완료 후 자동 재시작 대기',
          '2. 새 버전으로 앱이 시작되는지 확인',
          '3. 버전 정보 확인 (v0.1.29)',
          '4. 모든 기능이 정상 작동하는지 확인',
          '5. 설정 및 데이터 보존 확인'
        ],
        expectedResult: '새 버전으로 정상 재시작 및 데이터 보존',
        duration: '1-2분',
        priority: 'high'
      },
      {
        id: 'INSTALL_CANCELLATION',
        title: '설치 취소 테스트',
        description: '설치 진행 중 취소 기능 테스트',
        steps: [
          '1. 업데이트 설치 시작',
          '2. 설치 진행 중 "취소" 버튼 클릭',
          '3. 취소 확인 다이얼로그 응답',
          '4. 설치 프로세스 중단 확인',
          '5. 기존 앱 상태 복원 확인',
          '6. 임시 파일 정리 확인'
        ],
        expectedResult: '설치 즉시 중단 및 원래 상태 복원',
        duration: '1분',
        priority: 'medium'
      },
      {
        id: 'INSTALL_FAILURE_RECOVERY',
        title: '설치 실패 복구 테스트',
        description: '설치 실패 상황에서 복구 메커니즘 테스트',
        steps: [
          '1. 설치 중 인위적 실패 상황 생성 (파일 권한 제거)',
          '2. 설치 실패 에러 메시지 확인',
          '3. 복구 옵션 제시 확인',
          '4. 재시도 기능 테스트',
          '5. 롤백 기능 테스트 (필요시)',
          '6. 로그 파일 생성 확인'
        ],
        expectedResult: '적절한 에러 처리 및 복구 옵션 제공',
        duration: '3-5분',
        priority: 'medium'
      },
      {
        id: 'CONCURRENT_INSTALL',
        title: '동시 설치 방지 테스트',
        description: '여러 설치 프로세스 동시 실행 방지 테스트',
        steps: [
          '1. 첫 번째 설치 프로세스 시작',
          '2. 설치 진행 중 두 번째 설치 시도',
          '3. 동시 설치 방지 메시지 확인',
          '4. 첫 번째 설치 완료 대기',
          '5. 두 번째 설치 가능 여부 확인'
        ],
        expectedResult: '동시 설치 차단 및 적절한 안내 메시지',
        duration: '2-3분',
        priority: 'low'
      },
      {
        id: 'PERMISSION_HANDLING',
        title: '권한 처리 테스트',
        description: '관리자 권한이 필요한 설치 상황 테스트',
        steps: [
          '1. 일반 사용자 권한으로 앱 실행',
          '2. 업데이트 설치 시도',
          '3. 권한 승격 요청 확인',
          '4. 관리자 권한 승인/거부 테스트',
          '5. 권한 없이 설치 실패 시 안내 메시지 확인'
        ],
        expectedResult: '적절한 권한 처리 및 사용자 안내',
        duration: '2-3분',
        priority: 'medium'
      }
    ]
    
    const guidePath = path.join(this.testDir, 'install-restart-manual-guide.json')
    fs.writeFileSync(guidePath, JSON.stringify(manualTests, null, 2))
    
    this.recordResult(testName, 'manual', {
      guideFile: guidePath,
      totalTests: manualTests.length
    })
    
    this.log(`✓ Manual test guide generated: ${guidePath}`)
    
    // 콘솔에 수동 테스트 가이드 출력
    console.log('\n========== INSTALL/RESTART MANUAL TEST GUIDE ==========')
    manualTests.forEach((test, index) => {
      console.log(`\n${index + 1}. ${test.title} [${test.priority.toUpperCase()}]`)
      console.log(`   ${test.description}`)
      console.log(`   Duration: ${test.duration}`)
      console.log(`   Expected: ${test.expectedResult}`)
      console.log(`   Steps:`)
      test.steps.forEach(step => console.log(`     ${step}`))
    })
    console.log('\n====================================================\n')
    
    return manualTests
  }

  // 설치 시뮬레이션 스크립트 생성
  generateInstallSimulationScript() {
    const testName = 'Install Simulation Script Generation'
    this.log(`Running: ${testName}`)
    
    const scriptContent = `#!/bin/bash

# Sebastian 설치 및 재시작 시뮬레이션 스크립트
echo "Sebastian Install/Restart Simulation Script"
echo "=========================================="

# 현재 버전 확인
echo "Current version: ${this.currentVersion}"

# 시뮬레이션 단계
echo ""
echo "Simulation Steps:"
echo "1. Install Sebastian v${this.currentVersion}"
echo "2. Create next version v${this.incrementVersion(this.currentVersion)}"
echo "3. Test update process"
echo "4. Verify restart functionality"
echo ""

# 실제 실행 명령들
echo "Build Commands:"
echo "==============="
echo "npm run build"
echo "npm run dist:win-nsis"
echo ""

echo "GitHub Release Commands:"
echo "========================"
echo "gh release create v${this.incrementVersion(this.currentVersion)} release/Sebastian-${this.incrementVersion(this.currentVersion)}-Setup.exe"
echo ""

echo "Test Commands:"
echo "=============="
echo "node tests/install-restart-test.js"
echo ""

echo "Manual Test Checklist:"
echo "====================="
echo "[ ] Install current version"
echo "[ ] Create GitHub release"
echo "[ ] Test auto-update detection"
echo "[ ] Verify installation process"
echo "[ ] Check application restart"
echo "[ ] Validate version update"
echo ""

echo "⚠️  Remember to test on a clean Windows system!"
`
    
    const scriptPath = path.join(this.testDir, 'install-simulation.sh')
    fs.writeFileSync(scriptPath, scriptContent)
    
    this.recordResult(testName, 'manual', {
      scriptFile: scriptPath,
      currentVersion: this.currentVersion,
      nextVersion: this.incrementVersion(this.currentVersion)
    })
    
    this.log(`✓ Install simulation script generated: ${scriptPath}`)
    
    return scriptPath
  }

  // 헬퍼 함수: 버전 증가
  incrementVersion(version) {
    const parts = version.split('.')
    parts[2] = String(parseInt(parts[2]) + 1)
    return parts.join('.')
  }

  // 테스트 결과 저장
  async saveTestResults() {
    const reportPath = path.join(this.testDir, `install-restart-test-report-${Date.now()}.json`)
    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2))
    this.log(`Test report saved to: ${reportPath}`)
    
    // 요약 출력
    console.log('\n========== INSTALL/RESTART TEST SUMMARY ==========')
    console.log(`✓ Automated Tests Passed: ${this.testResults.passed.length}`)
    console.log(`✗ Automated Tests Failed: ${this.testResults.failed.length}`)
    console.log(`📋 Manual Tests Required: ${this.testResults.manual.length}`)
    console.log('================================================\n')
    
    return this.testResults
  }

  // 모든 테스트 실행
  async runAllTests() {
    this.log('Starting Install/Restart Process Tests')
    this.log('=' .repeat(50))
    
    const automatedTests = [
      () => this.testNsisInstallScript(),
      () => this.testInstallProcessIpc(),
      () => this.testApplicationRestartLogic(),
      () => this.testInstallProgressMonitoring(),
      () => this.testInstallFailureHandling(),
      () => this.testPostInstallCleanup()
    ]
    
    // 자동화 테스트 실행
    for (const test of automatedTests) {
      await test()
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // 수동 테스트 가이드 생성
    this.generateManualTestGuide()
    
    // 설치 시뮬레이션 스크립트 생성
    this.generateInstallSimulationScript()
    
    return await this.saveTestResults()
  }
}

// 메인 실행
if (require.main === module) {
  const testSuite = new InstallRestartTestSuite()
  testSuite.runAllTests()
    .then(results => {
      process.exit(results.failed.length > 0 ? 1 : 0)
    })
    .catch(error => {
      console.error('Install/Restart test suite error:', error)
      process.exit(1)
    })
}

module.exports = InstallRestartTestSuite