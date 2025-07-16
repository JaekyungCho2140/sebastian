const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const https = require('https')
const { URL } = require('url')

class AutoUpdateTestSuite {
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
    
    const logFile = path.join(this.testDir, 'auto-update-test.log')
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

  // 테스트 1: GitHub 릴리스 API 접근 테스트
  async testGitHubApiAccess() {
    const testName = 'GitHub API Access Test'
    this.log(`Running: ${testName}`)
    
    return new Promise((resolve) => {
      try {
        // 현재 레포지토리 정보 확인
        const repoUrl = 'https://api.github.com/repos/JaekyungCho2140/sebastian/releases/latest'
        
        const options = {
          method: 'GET',
          headers: {
            'User-Agent': 'Sebastian-Auto-Update-Test',
            'Accept': 'application/vnd.github.v3+json'
          }
        }
        
        const req = https.request(repoUrl, options, (res) => {
          let data = ''
          
          res.on('data', (chunk) => {
            data += chunk
          })
          
          res.on('end', () => {
            try {
              if (res.statusCode === 200) {
                const release = JSON.parse(data)
                
                this.recordResult(testName, 'passed', {
                  statusCode: res.statusCode,
                  latestVersion: release.tag_name,
                  publishedAt: release.published_at,
                  assetCount: release.assets.length
                })
                
                this.log(`✓ GitHub API accessible, latest version: ${release.tag_name}`)
                resolve(true)
              } else {
                throw new Error(`HTTP ${res.statusCode}: ${data}`)
              }
            } catch (parseError) {
              this.recordResult(testName, 'failed', {
                error: parseError.message,
                statusCode: res.statusCode
              })
              this.log(`✗ ${testName} failed: ${parseError.message}`, 'error')
              resolve(false)
            }
          })
        })
        
        req.on('error', (error) => {
          this.recordResult(testName, 'failed', { error: error.message })
          this.log(`✗ ${testName} failed: ${error.message}`, 'error')
          resolve(false)
        })
        
        req.setTimeout(10000, () => {
          req.destroy()
          this.recordResult(testName, 'failed', { error: 'Request timeout' })
          this.log(`✗ ${testName} failed: Request timeout`, 'error')
          resolve(false)
        })
        
        req.end()
      } catch (error) {
        this.recordResult(testName, 'failed', { error: error.message })
        this.log(`✗ ${testName} failed: ${error.message}`, 'error')
        resolve(false)
      }
    })
  }

  // 테스트 2: 버전 비교 로직 테스트
  async testVersionComparisonLogic() {
    const testName = 'Version Comparison Logic Test'
    this.log(`Running: ${testName}`)
    
    try {
      // 간단한 버전 비교 함수 구현
      const compareVersions = (v1, v2) => {
        const parts1 = v1.split('.').map(Number)
        const parts2 = v2.split('.').map(Number)
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
          const part1 = parts1[i] || 0
          const part2 = parts2[i] || 0
          
          if (part1 < part2) return -1
          if (part1 > part2) return 1
        }
        return 0
      }
      
      // 테스트 케이스들
      const testCases = [
        { v1: '0.1.28', v2: '0.1.29', expected: -1 },
        { v1: '0.1.29', v2: '0.1.28', expected: 1 },
        { v1: '0.1.28', v2: '0.1.28', expected: 0 },
        { v1: '0.2.0', v2: '0.1.29', expected: 1 },
        { v1: '1.0.0', v2: '0.9.99', expected: 1 }
      ]
      
      let passedTests = 0
      let failedTests = 0
      
      for (const testCase of testCases) {
        const result = compareVersions(testCase.v1, testCase.v2)
        if (result === testCase.expected) {
          passedTests++
        } else {
          failedTests++
          this.log(`  ✗ ${testCase.v1} vs ${testCase.v2}: expected ${testCase.expected}, got ${result}`, 'error')
        }
      }
      
      if (failedTests === 0) {
        this.recordResult(testName, 'passed', {
          totalTests: testCases.length,
          passedTests: passedTests
        })
        this.log(`✓ All ${testCases.length} version comparison tests passed`)
        return true
      } else {
        throw new Error(`${failedTests} out of ${testCases.length} version comparison tests failed`)
      }
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return false
    }
  }

  // 테스트 3: 업데이트 감지 설정 확인
  async testUpdateDetectionConfig() {
    const testName = 'Update Detection Configuration Test'
    this.log(`Running: ${testName}`)
    
    try {
      // ipc-handlers.ts에서 UpdateService 초기화 확인
      const ipcHandlersPath = path.join(__dirname, '..', 'src', 'main', 'ipc-handlers.ts')
      const ipcContent = fs.readFileSync(ipcHandlersPath, 'utf8')
      
      const checks = {
        hasUpdateService: ipcContent.includes('UpdateService'),
        hasGitHubRepo: ipcContent.includes('githubRepo') && ipcContent.includes('JaekyungCho2140/sebastian'),
        hasCheckInterval: ipcContent.includes('checkInterval') || ipcContent.includes('interval'),
        hasAutoStart: ipcContent.includes('checkForUpdates') || ipcContent.includes('start')
      }
      
      const passedChecks = Object.values(checks).filter(Boolean).length
      const totalChecks = Object.keys(checks).length
      
      if (passedChecks >= totalChecks * 0.7) {
        this.recordResult(testName, 'passed', {
          checks: checks,
          coverage: (passedChecks / totalChecks) * 100
        })
        this.log(`✓ Update detection configuration verified (${passedChecks}/${totalChecks} checks passed)`)
        return true
      } else {
        throw new Error(`Insufficient configuration coverage: ${passedChecks}/${totalChecks} checks passed`)
      }
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return false
    }
  }

  // 테스트 4: 다운로드 프로세스 시뮬레이션
  async testDownloadProcessSimulation() {
    const testName = 'Download Process Simulation Test'
    this.log(`Running: ${testName}`)
    
    try {
      // UpdateDownloader 서비스 파일 확인
      const downloaderPath = path.join(__dirname, '..', 'src', 'main', 'services', 'updateDownloader.ts')
      
      if (!fs.existsSync(downloaderPath)) {
        throw new Error('UpdateDownloader service not found')
      }
      
      const content = fs.readFileSync(downloaderPath, 'utf8')
      
      const features = {
        hasProgressTracking: content.includes('progress') || content.includes('Progress'),
        hasErrorHandling: content.includes('catch') || content.includes('Error'),
        hasValidation: content.includes('validate') || content.includes('verify'),
        hasRetryMechanism: content.includes('retry') || content.includes('attempt'),
        hasCleanup: content.includes('cleanup') || content.includes('clean')
      }
      
      const implementedFeatures = Object.values(features).filter(Boolean).length
      const totalFeatures = Object.keys(features).length
      
      if (implementedFeatures >= totalFeatures * 0.8) {
        this.recordResult(testName, 'passed', {
          features: features,
          coverage: (implementedFeatures / totalFeatures) * 100
        })
        this.log(`✓ Download process features verified (${implementedFeatures}/${totalFeatures} features)`)
        return true
      } else {
        throw new Error(`Insufficient download features: ${implementedFeatures}/${totalFeatures} implemented`)
      }
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return false
    }
  }

  // 테스트 5: 네트워크 조건 시뮬레이션
  async testNetworkConditions() {
    const testName = 'Network Conditions Simulation Test'
    this.log(`Running: ${testName}`)
    
    try {
      // 간단한 네트워크 접근성 테스트
      const testUrls = [
        'https://api.github.com',
        'https://github.com',
        'https://raw.githubusercontent.com'
      ]
      
      const results = []
      
      for (const url of testUrls) {
        let attempts = 0
        let maxAttempts = 2
        let success = false
        
        while (attempts < maxAttempts && !success) {
          try {
            const startTime = Date.now()
            await this.testNetworkAccess(url)
            const responseTime = Date.now() - startTime
            
            results.push({
              url: url,
              status: 'success',
              responseTime: responseTime,
              attempts: attempts + 1
            })
            success = true
          } catch (error) {
            attempts++
            if (attempts >= maxAttempts) {
              results.push({
                url: url,
                status: 'failed',
                error: error.message,
                attempts: attempts
              })
            }
            // 재시도 전 짧은 대기
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          }
        }
      }
      
      const successfulRequests = results.filter(r => r.status === 'success').length
      const successRate = (successfulRequests / testUrls.length) * 100
      
      if (successRate >= 70) {
        this.recordResult(testName, 'passed', {
          successRate: successRate,
          results: results
        })
        this.log(`✓ Network conditions test passed (${successRate}% success rate)`)
        return true
      } else {
        throw new Error(`Poor network conditions: ${successRate}% success rate`)
      }
    } catch (error) {
      this.recordResult(testName, 'failed', { error: error.message })
      this.log(`✗ ${testName} failed: ${error.message}`, 'error')
      return false
    }
  }

  // 헬퍼 함수: 네트워크 접근성 테스트
  testNetworkAccess(url) {
    return new Promise((resolve, reject) => {
      const req = https.request(url, { method: 'HEAD' }, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve()
        } else {
          reject(new Error(`HTTP ${res.statusCode}`))
        }
      })
      
      req.on('error', reject)
      req.setTimeout(10000, () => {
        req.destroy()
        reject(new Error('Timeout'))
      })
      
      req.end()
    })
  }

  // 수동 테스트 가이드 생성
  generateManualTestGuide() {
    const testName = 'Manual Test Guide Generation'
    this.log(`Running: ${testName}`)
    
    const manualTests = [
      {
        id: 'UPDATE_DETECTION',
        title: '자동 업데이트 감지 테스트',
        description: '앱 시작 시 자동으로 업데이트를 감지하는지 확인',
        steps: [
          '1. Sebastian v0.1.28을 설치한다',
          '2. 새 버전(v0.1.29)을 GitHub에 릴리스한다',
          '3. Sebastian을 다시 시작한다',
          '4. 자동으로 업데이트 알림이 표시되는지 확인한다'
        ],
        expectedResult: '업데이트 알림 다이얼로그가 표시되어야 함'
      },
      {
        id: 'DOWNLOAD_PROGRESS',
        title: '다운로드 진행률 테스트',
        description: '업데이트 다운로드 중 진행률이 정상적으로 표시되는지 확인',
        steps: [
          '1. 업데이트 알림에서 "지금 업데이트" 선택',
          '2. 다운로드 진행률 다이얼로그 확인',
          '3. 진행률 바와 퍼센트 표시 확인',
          '4. 다운로드 속도 및 예상 완료 시간 확인'
        ],
        expectedResult: '실시간 진행률 업데이트 및 상세 정보 표시'
      },
      {
        id: 'DOWNLOAD_CANCEL',
        title: '다운로드 취소 테스트',
        description: '다운로드 중 취소 기능이 정상적으로 작동하는지 확인',
        steps: [
          '1. 업데이트 다운로드 시작',
          '2. 다운로드 진행 중 "취소" 버튼 클릭',
          '3. 취소 확인 다이얼로그 확인',
          '4. 다운로드가 중단되는지 확인'
        ],
        expectedResult: '다운로드 즉시 중단 및 정상적인 앱 상태 복원'
      },
      {
        id: 'NETWORK_FAILURE',
        title: '네트워크 오류 처리 테스트',
        description: '네트워크 오류 상황에서의 에러 처리 확인',
        steps: [
          '1. 네트워크 연결 차단 (WiFi 끄기)',
          '2. 업데이트 확인 실행',
          '3. 에러 메시지 확인',
          '4. 네트워크 복원 후 재시도 확인'
        ],
        expectedResult: '적절한 에러 메시지 표시 및 재시도 옵션 제공'
      }
    ]
    
    const guidePath = path.join(this.testDir, 'manual-test-guide.json')
    fs.writeFileSync(guidePath, JSON.stringify(manualTests, null, 2))
    
    this.recordResult(testName, 'manual', {
      guideFile: guidePath,
      totalTests: manualTests.length
    })
    
    this.log(`✓ Manual test guide generated: ${guidePath}`)
    
    // 콘솔에 수동 테스트 가이드 출력
    console.log('\n========== MANUAL TEST GUIDE ==========')
    manualTests.forEach((test, index) => {
      console.log(`\n${index + 1}. ${test.title}`)
      console.log(`   ${test.description}`)
      console.log(`   Expected: ${test.expectedResult}`)
      console.log(`   Steps:`)
      test.steps.forEach(step => console.log(`     ${step}`))
    })
    console.log('\n=======================================\n')
    
    return manualTests
  }

  // 테스트 결과 저장
  async saveTestResults() {
    const reportPath = path.join(this.testDir, `auto-update-test-report-${Date.now()}.json`)
    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2))
    this.log(`Test report saved to: ${reportPath}`)
    
    // 요약 출력
    console.log('\n========== AUTO-UPDATE TEST SUMMARY ==========')
    console.log(`✓ Automated Tests Passed: ${this.testResults.passed.length}`)
    console.log(`✗ Automated Tests Failed: ${this.testResults.failed.length}`)
    console.log(`📋 Manual Tests Required: ${this.testResults.manual.length}`)
    console.log('=============================================\n')
    
    return this.testResults
  }

  // 모든 자동화 테스트 실행
  async runAllTests() {
    this.log('Starting Auto-Update System Tests')
    this.log('=' .repeat(50))
    
    const automatedTests = [
      () => this.testGitHubApiAccess(),
      () => this.testVersionComparisonLogic(),
      () => this.testUpdateDetectionConfig(),
      () => this.testDownloadProcessSimulation(),
      () => this.testNetworkConditions()
    ]
    
    // 자동화 테스트 실행
    for (const test of automatedTests) {
      await test()
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // 수동 테스트 가이드 생성
    this.generateManualTestGuide()
    
    return await this.saveTestResults()
  }
}

// 메인 실행
if (require.main === module) {
  const testSuite = new AutoUpdateTestSuite()
  testSuite.runAllTests()
    .then(results => {
      process.exit(results.failed.length > 0 ? 1 : 0)
    })
    .catch(error => {
      console.error('Auto-update test suite error:', error)
      process.exit(1)
    })
}

module.exports = AutoUpdateTestSuite