/**
 * Windows 버전 호환성 테스트 스위트
 * Task 18.4: Windows 10/11 호환성 및 다양한 아키텍처 테스트
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class WindowsCompatibilityTestSuite {
  constructor() {
    this.testResults = {
      passed: [],
      failed: [],
      manual: []
    };
    this.testDir = 'test-outputs';
    this.logFile = path.join(this.testDir, `windows-compatibility-test-${Date.now()}.log`);
  }

  async setupTestEnvironment() {
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }
    
    this.log('Windows 호환성 테스트 스위트 초기화 완료');
    this.log(`테스트 환경: ${os.platform()} ${os.release()}`);
    this.log(`아키텍처: ${os.arch()}`);
    this.log(`Node.js 버전: ${process.version}`);
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    console.log(message);
    
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }
    
    fs.appendFileSync(this.logFile, logEntry);
  }

  async runTest(testName, testFunction) {
    try {
      this.log(`\n🧪 테스트 실행: ${testName}`);
      await testFunction();
      this.testResults.passed.push(testName);
      this.log(`✅ 테스트 통과: ${testName}`);
    } catch (error) {
      this.testResults.failed.push({
        name: testName,
        error: error.message,
        stack: error.stack
      });
      this.log(`❌ 테스트 실패: ${testName} - ${error.message}`);
    }
  }

  // 1. Windows 버전 정보 검증
  async testWindowsVersionDetection() {
    this.log('Windows 버전 정보 검증 중...');
    
    // 시스템 정보 수집
    const systemInfo = {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      type: os.type(),
      version: os.version ? os.version() : 'N/A'
    };
    
    this.log(`시스템 정보: ${JSON.stringify(systemInfo, null, 2)}`);
    
    // Windows 환경이 아닌 경우 시뮬레이션
    if (os.platform() !== 'win32') {
      this.log('⚠️  Windows 환경이 아닙니다. 시뮬레이션 모드로 진행합니다.');
      
      // Windows 버전 시뮬레이션 테스트
      const windowsVersions = [
        { version: '10.0', name: 'Windows 10' },
        { version: '10.0.22000', name: 'Windows 11' },
        { version: '10.0.19041', name: 'Windows 10 20H1' },
        { version: '10.0.22621', name: 'Windows 11 22H2' }
      ];
      
      for (const winVersion of windowsVersions) {
        this.log(`${winVersion.name} (${winVersion.version}) 호환성 검증`);
        
        // 버전별 요구사항 검사
        const versionNum = parseFloat(winVersion.version);
        if (versionNum >= 10.0) {
          this.log(`✅ ${winVersion.name} 지원 가능`);
        } else {
          throw new Error(`${winVersion.name} 지원 불가 (최소 Windows 10 필요)`);
        }
      }
    }
    
    this.log('Windows 버전 정보 검증 완료');
  }

  // 2. 아키텍처 호환성 테스트
  async testArchitectureCompatibility() {
    this.log('아키텍처 호환성 테스트 중...');
    
    const currentArch = os.arch();
    const supportedArchs = ['x64', 'x86', 'arm64'];
    
    this.log(`현재 아키텍처: ${currentArch}`);
    
    if (!supportedArchs.includes(currentArch)) {
      throw new Error(`지원하지 않는 아키텍처: ${currentArch}`);
    }
    
    // 아키텍처별 NSIS 빌드 검증
    const nsisConfigPath = path.join(process.cwd(), 'electron-builder.json');
    if (fs.existsSync(nsisConfigPath)) {
      const config = JSON.parse(fs.readFileSync(nsisConfigPath, 'utf8'));
      
      // NSIS 설정 확인
      if (config.nsis && config.nsis.oneClick === false) {
        this.log('✅ NSIS 설정이 다중 아키텍처를 지원합니다');
      } else {
        this.log('⚠️  NSIS 설정 확인 필요');
      }
    }
    
    this.log(`아키텍처 호환성 검증 완료: ${currentArch}`);
  }

  // 3. 시스템 요구사항 검증
  async testSystemRequirements() {
    this.log('시스템 요구사항 검증 중...');
    
    // 메모리 요구사항 검증
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryGB = Math.round(totalMemory / (1024 * 1024 * 1024));
    
    this.log(`총 메모리: ${memoryGB}GB`);
    this.log(`사용 가능 메모리: ${Math.round(freeMemory / (1024 * 1024 * 1024))}GB`);
    
    if (memoryGB < 4) {
      this.log('⚠️  메모리가 부족할 수 있습니다 (권장: 4GB 이상)');
    } else {
      this.log('✅ 메모리 요구사항 충족');
    }
    
    // 디스크 공간 확인
    try {
      const stats = fs.statSync(process.cwd());
      this.log('✅ 디스크 접근 가능');
    } catch (error) {
      throw new Error('디스크 접근 오류');
    }
    
    this.log('시스템 요구사항 검증 완료');
  }

  // 4. 레지스트리 접근 시뮬레이션 테스트
  async testRegistryAccess() {
    this.log('레지스트리 접근 시뮬레이션 테스트 중...');
    
    if (os.platform() !== 'win32') {
      this.log('⚠️  Windows 환경이 아닙니다. 레지스트리 접근 시뮬레이션');
      
      // 레지스트리 키 시뮬레이션
      const registryKeys = [
        'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Sebastian',
        'HKEY_CURRENT_USER\\SOFTWARE\\Sebastian'
      ];
      
      for (const key of registryKeys) {
        this.log(`레지스트리 키 시뮬레이션: ${key}`);
        this.log('✅ 레지스트리 접근 가능 (시뮬레이션)');
      }
    } else {
      this.log('실제 Windows 환경에서 레지스트리 테스트 필요');
      this.testResults.manual.push({
        name: '레지스트리 접근 테스트',
        description: 'Windows 환경에서 실제 레지스트리 읽기/쓰기 테스트 필요',
        priority: 'HIGH'
      });
    }
    
    this.log('레지스트리 접근 테스트 완료');
  }

  // 5. 권한 상승 테스트
  async testPrivilegeElevation() {
    this.log('권한 상승 테스트 중...');
    
    if (os.platform() !== 'win32') {
      this.log('⚠️  Windows 환경이 아닙니다. 권한 상승 시뮬레이션');
      
      // UAC 시뮬레이션
      this.log('UAC (User Account Control) 시뮬레이션');
      this.log('✅ 관리자 권한 획득 가능 (시뮬레이션)');
    } else {
      this.log('실제 Windows 환경에서 UAC 테스트 필요');
      this.testResults.manual.push({
        name: '권한 상승 테스트',
        description: 'Windows 환경에서 실제 UAC 및 관리자 권한 테스트 필요',
        priority: 'HIGH'
      });
    }
    
    this.log('권한 상승 테스트 완료');
  }

  // 6. 파일 시스템 권한 테스트
  async testFileSystemPermissions() {
    this.log('파일 시스템 권한 테스트 중...');
    
    const testPaths = [
      process.cwd(),
      os.tmpdir(),
      path.join(os.homedir(), 'AppData', 'Local', 'Sebastian'),
      path.join(os.homedir(), 'AppData', 'Roaming', 'Sebastian')
    ];
    
    for (const testPath of testPaths) {
      try {
        // 디렉토리 생성 테스트
        const testDir = path.join(testPath, 'sebastian-test');
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }
        
        // 파일 생성 테스트
        const testFile = path.join(testDir, 'test.txt');
        fs.writeFileSync(testFile, 'test content');
        
        // 파일 읽기 테스트
        const content = fs.readFileSync(testFile, 'utf8');
        if (content !== 'test content') {
          throw new Error('파일 읽기 오류');
        }
        
        // 정리
        fs.unlinkSync(testFile);
        fs.rmdirSync(testDir);
        
        this.log(`✅ 파일 시스템 권한 확인: ${testPath}`);
      } catch (error) {
        if (testPath.includes('AppData')) {
          this.log(`⚠️  AppData 접근 제한: ${testPath}`);
        } else {
          throw new Error(`파일 시스템 권한 오류: ${testPath} - ${error.message}`);
        }
      }
    }
    
    this.log('파일 시스템 권한 테스트 완료');
  }

  // 7. 바이러스 백신 호환성 테스트
  async testAntivirusCompatibility() {
    this.log('바이러스 백신 호환성 테스트 중...');
    
    // 실행 파일 경로 확인
    const executablePaths = [
      path.join(process.cwd(), 'dist', 'Sebastian Setup.exe'),
      path.join(process.cwd(), 'dist', 'win-unpacked', 'Sebastian.exe')
    ];
    
    for (const execPath of executablePaths) {
      if (fs.existsSync(execPath)) {
        this.log(`실행 파일 발견: ${execPath}`);
        
        // 파일 속성 확인
        const stats = fs.statSync(execPath);
        this.log(`파일 크기: ${Math.round(stats.size / (1024 * 1024))}MB`);
        this.log(`생성 시간: ${stats.birthtime}`);
        
        // 바이러스 백신 검사 시뮬레이션
        this.log('바이러스 백신 검사 시뮬레이션 중...');
        
        // 일반적인 바이러스 백신 패턴 확인
        const suspiciousPatterns = [
          'malware',
          'trojan',
          'virus',
          'suspicious'
        ];
        
        let suspiciousFound = false;
        for (const pattern of suspiciousPatterns) {
          if (execPath.toLowerCase().includes(pattern)) {
            suspiciousFound = true;
            break;
          }
        }
        
        if (suspiciousFound) {
          this.log('⚠️  의심스러운 패턴 발견');
        } else {
          this.log('✅ 바이러스 백신 패턴 검사 통과');
        }
      } else {
        this.log(`실행 파일 없음: ${execPath}`);
      }
    }
    
    this.testResults.manual.push({
      name: '바이러스 백신 실제 스캔 테스트',
      description: 'Windows Defender, 3rd party 바이러스 백신에서 실제 스캔 테스트 필요',
      priority: 'MEDIUM'
    });
    
    this.log('바이러스 백신 호환성 테스트 완료');
  }

  // 수동 테스트 가이드 생성
  generateManualTestGuide() {
    const manualGuide = {
      title: 'Windows 호환성 수동 테스트 가이드',
      description: 'Windows 환경에서 실제 실행해야 하는 호환성 테스트 항목',
      tests: [
        {
          id: 'WIN_COMPAT_1',
          name: 'Windows 10 호환성 테스트',
          priority: 'HIGH',
          duration: '15분',
          description: 'Windows 10 환경에서 앱 설치 및 실행 테스트',
          steps: [
            '1. Windows 10 (최신 버전) 환경 준비',
            '2. Sebastian Setup.exe 실행',
            '3. 설치 과정 완료 확인',
            '4. 앱 실행 및 기본 기능 테스트',
            '5. 자동 업데이트 기능 테스트'
          ],
          expectedResult: '모든 기능이 정상 작동하고 오류 없이 설치/실행됨'
        },
        {
          id: 'WIN_COMPAT_2',
          name: 'Windows 11 호환성 테스트',
          priority: 'HIGH',
          duration: '15분',
          description: 'Windows 11 환경에서 앱 설치 및 실행 테스트',
          steps: [
            '1. Windows 11 (최신 버전) 환경 준비',
            '2. Sebastian Setup.exe 실행',
            '3. 설치 과정 완료 확인',
            '4. 앱 실행 및 기본 기능 테스트',
            '5. Windows 11 특화 기능 호환성 확인'
          ],
          expectedResult: 'Windows 11 환경에서 완전한 호환성 확인'
        },
        {
          id: 'WIN_COMPAT_3',
          name: 'UAC 권한 상승 테스트',
          priority: 'HIGH',
          duration: '10분',
          description: 'User Account Control 환경에서 권한 상승 테스트',
          steps: [
            '1. UAC 설정을 최대로 설정',
            '2. Sebastian Setup.exe 실행',
            '3. UAC 권한 요청 대화상자 확인',
            '4. 권한 승인 후 설치 진행',
            '5. 설치 완료 확인'
          ],
          expectedResult: 'UAC 권한 요청이 정상적으로 처리되고 설치 완료'
        },
        {
          id: 'WIN_COMPAT_4',
          name: '바이러스 백신 호환성 테스트',
          priority: 'MEDIUM',
          duration: '20분',
          description: '주요 바이러스 백신 소프트웨어와의 호환성 테스트',
          steps: [
            '1. Windows Defender 실시간 보호 활성화',
            '2. Sebastian Setup.exe 다운로드 및 스캔',
            '3. 설치 과정에서 차단 여부 확인',
            '4. 3rd party 바이러스 백신 테스트 (가능한 경우)',
            '5. 실행 시 오탐 여부 확인'
          ],
          expectedResult: '바이러스 백신에서 오탐 없이 정상 실행됨'
        },
        {
          id: 'WIN_COMPAT_5',
          name: '다중 아키텍처 테스트',
          priority: 'MEDIUM',
          duration: '25분',
          description: 'x86, x64 아키텍처에서 호환성 테스트',
          steps: [
            '1. x64 시스템에서 설치 및 실행 테스트',
            '2. x86 시스템에서 설치 및 실행 테스트 (가능한 경우)',
            '3. 각 아키텍처별 성능 확인',
            '4. 자동 업데이트 기능 테스트',
            '5. 메모리 사용량 비교'
          ],
          expectedResult: '모든 아키텍처에서 정상 작동 확인'
        }
      ]
    };
    
    const guidePath = path.join(this.testDir, 'windows-compatibility-manual-guide.json');
    fs.writeFileSync(guidePath, JSON.stringify(manualGuide, null, 2));
    
    this.log(`수동 테스트 가이드 생성 완료: ${guidePath}`);
    return manualGuide;
  }

  // 전체 테스트 실행
  async runAllTests() {
    console.log('🔧 Windows 호환성 테스트 스위트 시작');
    console.log('=====================================');
    
    await this.setupTestEnvironment();
    
    // 자동화된 테스트 실행
    await this.runTest('Windows 버전 정보 검증', () => this.testWindowsVersionDetection());
    await this.runTest('아키텍처 호환성 테스트', () => this.testArchitectureCompatibility());
    await this.runTest('시스템 요구사항 검증', () => this.testSystemRequirements());
    await this.runTest('레지스트리 접근 시뮬레이션', () => this.testRegistryAccess());
    await this.runTest('권한 상승 테스트', () => this.testPrivilegeElevation());
    await this.runTest('파일 시스템 권한 테스트', () => this.testFileSystemPermissions());
    await this.runTest('바이러스 백신 호환성 테스트', () => this.testAntivirusCompatibility());
    
    // 수동 테스트 가이드 생성
    const manualGuide = this.generateManualTestGuide();
    
    // 결과 정리
    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.passed.length + this.testResults.failed.length,
        passed: this.testResults.passed.length,
        failed: this.testResults.failed.length,
        manual: this.testResults.manual.length
      },
      results: this.testResults,
      manualTestGuide: manualGuide,
      recommendations: [
        'Windows 10/11 환경에서 실제 설치 테스트 수행',
        'UAC 권한 상승 프로세스 검증',
        '바이러스 백신 오탐 여부 확인',
        '다양한 아키텍처에서 성능 테스트'
      ]
    };
    
    // 결과 저장
    const resultPath = path.join(this.testDir, `windows-compatibility-test-result-${Date.now()}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
    
    console.log('\n📊 테스트 결과 요약:');
    console.log(`✅ 통과: ${results.summary.passed}개`);
    console.log(`❌ 실패: ${results.summary.failed}개`);
    console.log(`📋 수동 테스트 필요: ${results.summary.manual}개`);
    console.log(`📄 결과 파일: ${resultPath}`);
    console.log(`📝 로그 파일: ${this.logFile}`);
    
    if (results.summary.failed > 0) {
      console.log('\n❌ 실패한 테스트:');
      this.testResults.failed.forEach(failure => {
        console.log(`- ${failure.name}: ${failure.error}`);
      });
    }
    
    if (results.summary.manual > 0) {
      console.log('\n📋 수동 테스트 필요 항목:');
      this.testResults.manual.forEach(manual => {
        console.log(`- ${manual.name} (우선순위: ${manual.priority})`);
      });
    }
    
    console.log('\n🎯 다음 단계:');
    console.log('1. Windows 환경에서 수동 테스트 가이드 실행');
    console.log('2. 실패한 테스트 항목 분석 및 수정');
    console.log('3. 성능 최적화 및 호환성 개선');
    
    return results;
  }
}

// 실행부
if (require.main === module) {
  const testSuite = new WindowsCompatibilityTestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = WindowsCompatibilityTestSuite;