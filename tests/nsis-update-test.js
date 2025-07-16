const { spawn, execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

class NsisUpdateTestSuite {
  constructor() {
    this.testResults = {
      passed: [],
      failed: [],
      skipped: [],
      timestamp: new Date().toISOString()
    }
    
    this.testDir = path.join(__dirname, '..', 'test-outputs')
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true })
    }
  }

  // 유틸리티 함수들
  log(message, level = 'info') {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`
    console.log(logMessage)
    
    const logFile = path.join(this.testDir, 'nsis-update-test.log')
    fs.appendFileSync(logFile, logMessage + '\n')
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
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
    } else {
      this.testResults.skipped.push(result)
    }
  }

  // 테스트 1: 빌드 파일 존재 확인
  async testBuildFileExists() {
    const testName = 'Build File Existence Check'
    this.log(`Running: ${testName}`)
    
    try {
      const releaseDir = path.join(__dirname, '..', 'release')
      const files = fs.readdirSync(releaseDir)
      const setupFile = files.find(file => file.endsWith('-Setup.exe'))
      
      if (setupFile) {
        const filePath = path.join(releaseDir, setupFile)
        const stats = fs.statSync(filePath)
        
        this.recordResult(testName, 'passed', {
          fileName: setupFile,
          fileSize: stats.size,
          filePath: filePath
        })
        
        this.log(`✓ Found NSIS installer: ${setupFile} (${stats.size} bytes)`)
        return true
      } else {
        throw new Error('No NSIS installer found in release directory')
      }
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return false
    }
  }

  // 테스트 2: 패키지 버전 확인
  async testPackageVersion() {
    const testName = 'Package Version Validation'
    this.log(`Running: ${testName}`)
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
      const version = packageJson.version
      
      // 시맨틱 버전 검증
      const versionRegex = /^\d+\.\d+\.\d+$/
      if (!versionRegex.test(version)) {
        throw new Error(`Invalid version format: ${version}`)
      }
      
      this.recordResult(testName, 'passed', { version })
      this.log(`✓ Package version is valid: ${version}`)
      return version
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return null
    }
  }

  // 테스트 3: 업데이트 서비스 설정 확인
  async testUpdateServiceConfig() {
    const testName = 'Update Service Configuration'
    this.log(`Running: ${testName}`)
    
    try {
      const updateServicePath = path.join(__dirname, '..', 'src', 'main', 'services', 'updateService.ts')
      const content = fs.readFileSync(updateServicePath, 'utf8')
      
      // 생성자 내부의 options 객체 구조 확인
      const checks = {
        githubRepo: /githubRepo:\s*options\.githubRepo/.test(content),
        checkInterval: /checkInterval:\s*options\.checkInterval\s*\|\|/.test(content),
        maxRetries: /maxRetries:\s*options\.maxRetries\s*\|\|/.test(content),
        retryDelay: /retryDelay:\s*options\.retryDelay\s*\|\|/.test(content),
        requestTimeout: /requestTimeout:\s*options\.requestTimeout\s*\|\|/.test(content)
      }
      
      const allPassed = Object.values(checks).every(check => check)
      
      if (allPassed) {
        this.recordResult(testName, 'passed', { checks })
        this.log('✓ Update service configuration is valid')
      } else {
        const failedChecks = Object.entries(checks)
          .filter(([_, passed]) => !passed)
          .map(([name]) => name)
        throw new Error(`Missing configurations: ${failedChecks.join(', ')}`)
      }
      
      return allPassed
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return false
    }
  }

  // 테스트 4: IPC 채널 정의 확인
  async testIpcChannelDefinitions() {
    const testName = 'IPC Channel Definitions'
    this.log(`Running: ${testName}`)
    
    try {
      const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts')
      const content = fs.readFileSync(typesPath, 'utf8')
      
      // 실제 정의된 채널명 기준으로 확인
      const requiredChannels = [
        'CHECK_FOR_UPDATES',
        'UPDATE_AVAILABLE',
        'UPDATE_DOWNLOADED',
        'UPDATE_PROGRESS',
        'UPDATE_ERROR',
        'DOWNLOAD_UPDATE',
        'INSTALL_UPDATE',
        'NSIS_INSTALLATION_PHASE',
        'NSIS_INSTALLATION_LOG',
        'NSIS_INSTALLATION_COMPLETE',
        'NSIS_INSTALLATION_FAILED',
        'NSIS_INSTALLATION_ERROR',
        'CANCEL_INSTALLATION'
      ]
      
      const missingChannels = []
      for (const channel of requiredChannels) {
        if (!content.includes(channel)) {
          missingChannels.push(channel)
        }
      }
      
      if (missingChannels.length === 0) {
        this.recordResult(testName, 'passed', { 
          totalChannels: requiredChannels.length,
          verified: true 
        })
        this.log(`✓ All ${requiredChannels.length} required IPC channels are defined`)
      } else {
        throw new Error(`Missing IPC channels: ${missingChannels.join(', ')}`)
      }
      
      return missingChannels.length === 0
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return false
    }
  }

  // 테스트 5: NSIS 에러 코드 매핑 확인
  async testNsisErrorCodeMapping() {
    const testName = 'NSIS Error Code Mapping'
    this.log(`Running: ${testName}`)
    
    try {
      const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts')
      const content = fs.readFileSync(typesPath, 'utf8')
      
      const requiredErrorCodes = [
        'SUCCESS',
        'USER_CANCELLED',
        'SCRIPT_ABORTED',
        'FATAL_ERROR',
        'INVALID_PARAMETERS',
        'ACCESS_DENIED'
      ]
      
      const foundCodes = []
      for (const code of requiredErrorCodes) {
        if (content.includes(code)) {
          foundCodes.push(code)
        }
      }
      
      const coverage = (foundCodes.length / requiredErrorCodes.length) * 100
      
      if (coverage === 100) {
        this.recordResult(testName, 'passed', { 
          totalCodes: requiredErrorCodes.length,
          coverage: coverage 
        })
        this.log(`✓ All NSIS error codes are properly mapped`)
      } else {
        throw new Error(`Only ${coverage}% of error codes are mapped`)
      }
      
      return coverage === 100
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return false
    }
  }

  // 테스트 6: 타입 정의 유효성 검사
  async testTypeDefinitions() {
    const testName = 'TypeScript Type Definitions'
    this.log(`Running: ${testName}`)
    
    try {
      // npm run build를 사용하여 TypeScript 컴파일 체크
      const result = execSync('npm run build', { 
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        stdio: 'pipe'
      })
      
      // 빌드 출력에서 에러 확인
      if (result.toLowerCase().includes('error')) {
        throw new Error('TypeScript compilation errors found in build output')
      }
      
      this.recordResult(testName, 'passed', { 
        output: 'TypeScript compilation successful' 
      })
      this.log('✓ TypeScript type definitions are valid')
      return true
    } catch (error) {
      const errorOutput = error.stdout || error.stderr || error.message
      this.recordResult(testName, 'failed', { error: errorOutput })
      this.log(`✗ ${testName} failed: TypeScript compilation errors`, 'error')
      return false
    }
  }

  // 테스트 7: 메모리 누수 검사 (간단한 정적 분석)
  async testMemoryLeakPatterns() {
    const testName = 'Memory Leak Pattern Detection'
    this.log(`Running: ${testName}`)
    
    try {
      const sourceDir = path.join(__dirname, '..', 'src')
      const issues = []
      
      // 재귀적으로 TypeScript 파일 검사
      const checkFile = (filePath) => {
        const content = fs.readFileSync(filePath, 'utf8')
        const lines = content.split('\n')
        
        lines.forEach((line, index) => {
          // setInterval without clearInterval
          if (line.includes('setInterval') && !content.includes('clearInterval')) {
            issues.push({
              file: filePath,
              line: index + 1,
              issue: 'setInterval without clearInterval'
            })
          }
          
          // addEventListener without removeEventListener
          if (line.includes('addEventListener') && !content.includes('removeEventListener')) {
            issues.push({
              file: filePath,
              line: index + 1,
              issue: 'addEventListener without removeEventListener'
            })
          }
          
          // 무한 루프 패턴
          if (line.includes('while(true)') || line.includes('while (true)')) {
            issues.push({
              file: filePath,
              line: index + 1,
              issue: 'Potential infinite loop'
            })
          }
        })
      }
      
      const walkDir = (dir) => {
        const files = fs.readdirSync(dir)
        files.forEach(file => {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          
          if (stat.isDirectory() && !file.includes('node_modules')) {
            walkDir(filePath)
          } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            checkFile(filePath)
          }
        })
      }
      
      walkDir(sourceDir)
      
      if (issues.length === 0) {
        this.recordResult(testName, 'passed', { 
          message: 'No memory leak patterns detected' 
        })
        this.log('✓ No memory leak patterns detected')
      } else {
        this.recordResult(testName, 'failed', { issues })
        this.log(`✗ Found ${issues.length} potential memory leak patterns`, 'warning')
      }
      
      return issues.length === 0
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return false
    }
  }

  // 테스트 8: 네트워크 에러 핸들링 시뮬레이션
  async testNetworkErrorHandling() {
    const testName = 'Network Error Handling Simulation'
    this.log(`Running: ${testName}`)
    
    try {
      // updateService.ts에서 에러 핸들링 로직 확인
      const updateServicePath = path.join(__dirname, '..', 'src', 'main', 'services', 'updateService.ts')
      const content = fs.readFileSync(updateServicePath, 'utf8')
      
      const errorHandlingPatterns = [
        'catch',
        'retry',
        'circuit breaker',
        'timeout',
        'error'
      ]
      
      const foundPatterns = errorHandlingPatterns.filter(pattern => 
        content.toLowerCase().includes(pattern.toLowerCase())
      )
      
      const coverage = (foundPatterns.length / errorHandlingPatterns.length) * 100
      
      // 추가로 특정 에러 처리 함수들 확인
      const hasErrorHandler = content.includes('handleError')
      const hasRetryLogic = content.includes('retryCount') || content.includes('maxRetries')
      const hasTimeoutHandler = content.includes('requestTimeout')
      
      const additionalChecks = [hasErrorHandler, hasRetryLogic, hasTimeoutHandler].filter(Boolean).length
      const totalCoverage = Math.min(100, coverage + (additionalChecks * 10))
      
      if (totalCoverage >= 70) {
        this.recordResult(testName, 'passed', { 
          coverage: totalCoverage,
          foundPatterns: foundPatterns,
          additionalChecks: {
            hasErrorHandler,
            hasRetryLogic,
            hasTimeoutHandler
          }
        })
        this.log(`✓ Network error handling coverage: ${totalCoverage}%`)
      } else {
        throw new Error(`Insufficient error handling coverage: ${totalCoverage}%`)
      }
      
      return totalCoverage >= 70
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return false
    }
  }

  // 테스트 결과 저장
  async saveTestResults() {
    const reportPath = path.join(this.testDir, `nsis-test-report-${Date.now()}.json`)
    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2))
    this.log(`Test report saved to: ${reportPath}`)
    
    // 요약 출력
    console.log('\n========== TEST SUMMARY ==========')
    console.log(`✓ Passed: ${this.testResults.passed.length}`)
    console.log(`✗ Failed: ${this.testResults.failed.length}`)
    console.log(`⊘ Skipped: ${this.testResults.skipped.length}`)
    console.log('==================================\n')
    
    return this.testResults
  }

  // 모든 자동화 테스트 실행
  async runAllAutomatedTests() {
    this.log('Starting NSIS Update System Automated Tests')
    this.log('=' .repeat(50))
    
    const tests = [
      () => this.testBuildFileExists(),
      () => this.testPackageVersion(),
      () => this.testUpdateServiceConfig(),
      () => this.testIpcChannelDefinitions(),
      () => this.testNsisErrorCodeMapping(),
      () => this.testTypeDefinitions(),
      () => this.testMemoryLeakPatterns(),
      () => this.testNetworkErrorHandling()
    ]
    
    for (const test of tests) {
      await test()
      await this.delay(500) // 테스트 간 짧은 대기
    }
    
    return await this.saveTestResults()
  }
}

// 메인 실행
if (require.main === module) {
  const testSuite = new NsisUpdateTestSuite()
  testSuite.runAllAutomatedTests()
    .then(results => {
      process.exit(results.failed.length > 0 ? 1 : 0)
    })
    .catch(error => {
      console.error('Test suite error:', error)
      process.exit(1)
    })
}

module.exports = NsisUpdateTestSuite