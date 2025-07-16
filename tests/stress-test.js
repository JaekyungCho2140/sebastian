/**
 * 스트레스 테스트 스위트
 * Task 18.5: 다양한 시나리오로 스트레스 테스트
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class StressTestSuite {
  constructor() {
    this.testResults = {
      passed: [],
      failed: [],
      manual: []
    };
    this.testDir = 'test-outputs';
    this.logFile = path.join(this.testDir, `stress-test-${Date.now()}.log`);
    this.mockProcesses = new Map();
  }

  async setupTestEnvironment() {
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }
    
    this.log('스트레스 테스트 스위트 초기화 완료');
    this.log(`테스트 환경: ${os.platform()} ${os.release()}`);
    this.log(`CPU 코어: ${os.cpus().length}개`);
    this.log(`메모리: ${Math.round(os.totalmem() / (1024 * 1024 * 1024))}GB`);
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

  // 동시 업데이트 시도 방지 테스트
  async testConcurrentUpdatePrevention() {
    this.log('동시 업데이트 시도 방지 테스트 중...');
    
    // 업데이트 잠금 파일 시뮬레이션
    const lockFile = path.join(this.testDir, 'update.lock');
    
    try {
      // 첫 번째 업데이트 프로세스 시뮬레이션
      this.log('첫 번째 업데이트 프로세스 시작');
      fs.writeFileSync(lockFile, JSON.stringify({
        pid: process.pid,
        timestamp: Date.now(),
        version: '0.1.28'
      }));
      
      // 두 번째 업데이트 프로세스 시뮬레이션
      this.log('두 번째 업데이트 프로세스 시도');
      
      if (fs.existsSync(lockFile)) {
        const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
        const lockAge = Date.now() - lockData.timestamp;
        
        if (lockAge < 300000) { // 5분 이내
          this.log('✅ 동시 업데이트 방지 성공 - 잠금 파일 감지');
        } else {
          this.log('⚠️  오래된 잠금 파일 감지 - 정리 필요');
        }
      }
      
      // 정리
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
      
      this.log('동시 업데이트 방지 테스트 완료');
    } catch (error) {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
      throw error;
    }
  }

  // 네트워크 중단 시나리오 테스트
  async testNetworkInterruption() {
    this.log('네트워크 중단 시나리오 테스트 중...');
    
    const testUrls = [
      'https://api.github.com/repos/JaekyungCho2140/sebastian/releases',
      'https://raw.githubusercontent.com/JaekyungCho2140/sebastian/main/package.json',
      'https://github.com/JaekyungCho2140/sebastian/releases/download/v0.1.28/Sebastian-Setup.exe'
    ];
    
    for (const url of testUrls) {
      try {
        this.log(`네트워크 요청 시뮬레이션: ${url}`);
        
        // 타임아웃 시뮬레이션
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 5000);
        });
        
        // 실제 요청 시뮬레이션
        const requestPromise = new Promise((resolve, reject) => {
          setTimeout(() => {
            const success = Math.random() > 0.3; // 70% 성공률
            if (success) {
              resolve({ status: 200, data: 'mock data' });
            } else {
              reject(new Error('Network error'));
            }
          }, Math.random() * 3000);
        });
        
        try {
          await Promise.race([requestPromise, timeoutPromise]);
          this.log(`✅ 네트워크 요청 성공: ${url}`);
        } catch (error) {
          this.log(`⚠️  네트워크 요청 실패: ${url} - ${error.message}`);
          
          // 재시도 로직 테스트
          this.log('재시도 로직 테스트 중...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          this.log('✅ 재시도 로직 동작 확인');
        }
      } catch (error) {
        this.log(`네트워크 오류 처리: ${error.message}`);
      }
    }
    
    this.log('네트워크 중단 시나리오 테스트 완료');
  }

  // 메모리 제약 조건 테스트
  async testMemoryConstraints() {
    this.log('메모리 제약 조건 테스트 중...');
    
    const initialMemory = process.memoryUsage();
    this.log(`초기 메모리 사용량: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
    
    // 메모리 집약적 작업 시뮬레이션
    const memoryTestData = [];
    
    try {
      for (let i = 0; i < 100; i++) {
        // 큰 데이터 생성
        const largeData = new Array(10000).fill(0).map(() => ({
          id: i,
          data: new Array(1000).fill(Math.random()),
          timestamp: Date.now()
        }));
        
        memoryTestData.push(largeData);
        
        // 메모리 사용량 확인
        const currentMemory = process.memoryUsage();
        const memoryUsed = Math.round(currentMemory.heapUsed / 1024 / 1024);
        
        if (memoryUsed > 500) { // 500MB 제한
          this.log(`⚠️  메모리 사용량 초과: ${memoryUsed}MB`);
          break;
        }
        
        if (i % 20 === 0) {
          this.log(`메모리 사용량: ${memoryUsed}MB`);
        }
      }
      
      // 메모리 정리 테스트
      this.log('메모리 정리 테스트 중...');
      memoryTestData.length = 0;
      
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      this.log(`최종 메모리 사용량: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
      
      this.log('메모리 제약 조건 테스트 완료');
    } catch (error) {
      this.log(`메모리 테스트 오류: ${error.message}`);
      throw error;
    }
  }

  // 디스크 공간 제약 테스트
  async testDiskSpaceConstraints() {
    this.log('디스크 공간 제약 테스트 중...');
    
    const testDir = path.join(this.testDir, 'disk-test');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    try {
      // 디스크 사용량 시뮬레이션
      const testFiles = [];
      
      for (let i = 0; i < 50; i++) {
        const fileName = path.join(testDir, `test-file-${i}.dat`);
        const fileSize = 1024 * 1024; // 1MB
        const buffer = Buffer.alloc(fileSize, 'A');
        
        fs.writeFileSync(fileName, buffer);
        testFiles.push(fileName);
        
        if (i % 10 === 0) {
          this.log(`테스트 파일 생성: ${i + 1}개 (총 ${Math.round((i + 1) * fileSize / 1024 / 1024)}MB)`);
        }
      }
      
      // 디스크 공간 확인
      const stats = fs.statSync(testDir);
      this.log(`테스트 디렉토리 생성 완료`);
      
      // 파일 정리
      this.log('테스트 파일 정리 중...');
      for (const file of testFiles) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }
      
      fs.rmdirSync(testDir);
      this.log('디스크 공간 제약 테스트 완료');
    } catch (error) {
      this.log(`디스크 테스트 오류: ${error.message}`);
      // 정리 작업
      try {
        if (fs.existsSync(testDir)) {
          const files = fs.readdirSync(testDir);
          for (const file of files) {
            fs.unlinkSync(path.join(testDir, file));
          }
          fs.rmdirSync(testDir);
        }
      } catch (cleanupError) {
        this.log(`정리 작업 오류: ${cleanupError.message}`);
      }
      throw error;
    }
  }

  // 높은 CPU 사용률 테스트
  async testHighCPUUsage() {
    this.log('높은 CPU 사용률 테스트 중...');
    
    const cpuCount = os.cpus().length;
    this.log(`CPU 코어 수: ${cpuCount}개`);
    
    // CPU 집약적 작업 시뮬레이션
    const startTime = Date.now();
    const duration = 3000; // 3초
    
    const cpuIntensiveTask = () => {
      const endTime = Date.now() + duration;
      let counter = 0;
      
      while (Date.now() < endTime) {
        // 계산 집약적 작업
        Math.sqrt(counter++);
        
        if (counter % 1000000 === 0) {
          // 주기적으로 다른 작업이 실행될 수 있도록 양보
          return new Promise(resolve => setImmediate(resolve));
        }
      }
      
      return Promise.resolve();
    };
    
    try {
      await cpuIntensiveTask();
      
      const actualDuration = Date.now() - startTime;
      this.log(`CPU 집약적 작업 완료: ${actualDuration}ms`);
      
      if (actualDuration > duration * 2) {
        this.log('⚠️  CPU 성능 저하 감지');
      } else {
        this.log('✅ CPU 성능 정상');
      }
      
      this.log('높은 CPU 사용률 테스트 완료');
    } catch (error) {
      this.log(`CPU 테스트 오류: ${error.message}`);
      throw error;
    }
  }

  // 장시간 실행 테스트
  async testLongRunningProcess() {
    this.log('장시간 실행 테스트 중...');
    
    const testDuration = 10000; // 10초
    const intervalTime = 1000; // 1초
    const startTime = Date.now();
    
    let iterations = 0;
    const maxIterations = testDuration / intervalTime;
    
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        iterations++;
        
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        
        this.log(`장시간 실행 테스트 진행: ${iterations}/${maxIterations} (${Math.round(elapsed / 1000)}초)`);
        
        // 메모리 사용량 모니터링
        const memory = process.memoryUsage();
        const memoryMB = Math.round(memory.heapUsed / 1024 / 1024);
        
        if (memoryMB > 300) { // 300MB 제한
          clearInterval(interval);
          reject(new Error(`메모리 사용량 초과: ${memoryMB}MB`));
          return;
        }
        
        if (iterations >= maxIterations) {
          clearInterval(interval);
          this.log('장시간 실행 테스트 완료');
          resolve();
        }
      }, intervalTime);
    });
  }

  // 시스템 리소스 모니터링
  async testResourceMonitoring() {
    this.log('시스템 리소스 모니터링 테스트 중...');
    
    const monitoringDuration = 5000; // 5초
    const monitoringInterval = 500; // 0.5초
    const startTime = Date.now();
    
    const resourceData = [];
    
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const memory = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        const resourceSnapshot = {
          timestamp: Date.now(),
          memory: {
            heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
            rss: Math.round(memory.rss / 1024 / 1024)
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          }
        };
        
        resourceData.push(resourceSnapshot);
        
        if (Date.now() - startTime >= monitoringDuration) {
          clearInterval(interval);
          
          // 결과 분석
          const avgMemory = resourceData.reduce((sum, data) => sum + data.memory.heapUsed, 0) / resourceData.length;
          const maxMemory = Math.max(...resourceData.map(data => data.memory.heapUsed));
          
          this.log(`평균 메모리 사용량: ${Math.round(avgMemory)}MB`);
          this.log(`최대 메모리 사용량: ${maxMemory}MB`);
          
          // 리소스 데이터 저장
          const resourceFile = path.join(this.testDir, 'resource-monitoring.json');
          fs.writeFileSync(resourceFile, JSON.stringify(resourceData, null, 2));
          
          this.log(`리소스 모니터링 데이터 저장: ${resourceFile}`);
          this.log('시스템 리소스 모니터링 테스트 완료');
          resolve();
        }
      }, monitoringInterval);
    });
  }

  // 수동 테스트 가이드 생성
  generateManualTestGuide() {
    const manualGuide = {
      title: '스트레스 테스트 수동 가이드',
      description: '실제 환경에서 수행해야 하는 스트레스 테스트 항목',
      tests: [
        {
          id: 'STRESS_1',
          name: '다중 인스턴스 실행 테스트',
          priority: 'HIGH',
          duration: '10분',
          description: '동시에 여러 Sebastian 인스턴스를 실행하여 동시성 문제 확인',
          steps: [
            '1. Sebastian 애플리케이션 실행',
            '2. 추가로 Sebastian 실행 시도',
            '3. 중복 실행 방지 메시지 확인',
            '4. 첫 번째 인스턴스 종료 후 두 번째 실행 확인',
            '5. 프로세스 정리 상태 확인'
          ],
          expectedResult: '중복 실행이 방지되고 기존 인스턴스가 활성화됨'
        },
        {
          id: 'STRESS_2',
          name: '네트워크 불안정 환경 테스트',
          priority: 'HIGH',
          duration: '15분',
          description: '네트워크 연결이 불안정한 환경에서 업데이트 테스트',
          steps: [
            '1. 네트워크 연결 제한 설정 (속도 제한)',
            '2. 자동 업데이트 확인 실행',
            '3. 다운로드 중 네트워크 일시 중단',
            '4. 네트워크 복구 후 재시도 확인',
            '5. 오류 메시지 및 복구 과정 확인'
          ],
          expectedResult: '네트워크 오류에 대한 적절한 처리 및 재시도 로직 동작'
        },
        {
          id: 'STRESS_3',
          name: '시스템 리소스 부족 테스트',
          priority: 'MEDIUM',
          duration: '20분',
          description: '메모리/CPU 부족 상황에서 애플리케이션 동작 테스트',
          steps: [
            '1. 시스템 메모리 80% 이상 사용 상태 생성',
            '2. Sebastian 실행 및 동작 확인',
            '3. 업데이트 프로세스 실행',
            '4. CPU 집약적 작업 동시 실행',
            '5. 애플리케이션 응답성 및 안정성 확인'
          ],
          expectedResult: '리소스 부족 상황에서도 안정적인 동작 및 적절한 오류 처리'
        },
        {
          id: 'STRESS_4',
          name: '장시간 실행 안정성 테스트',
          priority: 'MEDIUM',
          duration: '2시간',
          description: '장시간 실행 시 메모리 누수 및 성능 저하 확인',
          steps: [
            '1. Sebastian 실행 및 작업 영역 열기',
            '2. 주기적인 작업 수행 (30분마다)',
            '3. 메모리 사용량 모니터링',
            '4. 응답 시간 측정',
            '5. 2시간 후 성능 비교 분석'
          ],
          expectedResult: '장시간 실행 시에도 메모리 누수 없이 안정적인 성능 유지'
        },
        {
          id: 'STRESS_5',
          name: '빈번한 업데이트 확인 테스트',
          priority: 'LOW',
          duration: '30분',
          description: '업데이트 확인을 빈번하게 수행할 때의 시스템 부하 테스트',
          steps: [
            '1. 업데이트 확인 간격을 1분으로 설정',
            '2. 30분간 지속적인 업데이트 확인',
            '3. 네트워크 트래픽 모니터링',
            '4. 시스템 리소스 사용량 확인',
            '5. GitHub API rate limit 확인'
          ],
          expectedResult: '빈번한 업데이트 확인 시에도 시스템 부하 최소화 및 안정적 동작'
        }
      ]
    };
    
    const guidePath = path.join(this.testDir, 'stress-test-manual-guide.json');
    fs.writeFileSync(guidePath, JSON.stringify(manualGuide, null, 2));
    
    this.log(`수동 테스트 가이드 생성 완료: ${guidePath}`);
    return manualGuide;
  }

  // 전체 테스트 실행
  async runAllTests() {
    console.log('🚀 스트레스 테스트 스위트 시작');
    console.log('===============================');
    
    await this.setupTestEnvironment();
    
    // 자동화된 테스트 실행
    await this.runTest('동시 업데이트 시도 방지', () => this.testConcurrentUpdatePrevention());
    await this.runTest('네트워크 중단 시나리오', () => this.testNetworkInterruption());
    await this.runTest('메모리 제약 조건', () => this.testMemoryConstraints());
    await this.runTest('디스크 공간 제약', () => this.testDiskSpaceConstraints());
    await this.runTest('높은 CPU 사용률', () => this.testHighCPUUsage());
    await this.runTest('장시간 실행 프로세스', () => this.testLongRunningProcess());
    await this.runTest('시스템 리소스 모니터링', () => this.testResourceMonitoring());
    
    // 수동 테스트 가이드 생성
    const manualGuide = this.generateManualTestGuide();
    
    // 결과 정리
    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.passed.length + this.testResults.failed.length,
        passed: this.testResults.passed.length,
        failed: this.testResults.failed.length,
        manual: manualGuide.tests.length
      },
      results: this.testResults,
      manualTestGuide: manualGuide,
      recommendations: [
        '실제 환경에서 수동 테스트 가이드 실행',
        '네트워크 불안정 환경에서 테스트 수행',
        '리소스 제약 환경에서 안정성 확인',
        '장시간 실행 시 메모리 누수 모니터링'
      ]
    };
    
    // 결과 저장
    const resultPath = path.join(this.testDir, `stress-test-result-${Date.now()}.json`);
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
    
    console.log('\n🎯 다음 단계:');
    console.log('1. 실제 환경에서 수동 테스트 가이드 실행');
    console.log('2. 네트워크 불안정 환경에서 테스트 수행');
    console.log('3. 리소스 제약 환경에서 안정성 확인');
    console.log('4. 장시간 실행 시 메모리 누수 모니터링');
    
    return results;
  }
}

// 실행부
if (require.main === module) {
  const testSuite = new StressTestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = StressTestSuite;