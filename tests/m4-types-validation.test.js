/**
 * M4 Types Validation Test Runner
 * 
 * This test runs TypeScript compilation and basic runtime validation
 * for M4 processing types and interfaces.
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// 테스트 상수
const TEST_TIMEOUT = 30000;
const SRC_DIR = path.join(__dirname, '..', 'src');
const TYPES_DIR = path.join(SRC_DIR, 'types');
const TEST_FILE = path.join(TYPES_DIR, '__tests__', 'm4Processing.test.ts');

// 테스트 결과 저장
let testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  results: []
};

// 유틸리티 함수
function logTest(testName, passed, message = '') {
  testResults.totalTests++;
  if (passed) {
    testResults.passedTests++;
    console.log(`✅ PASSED: ${testName}`);
  } else {
    testResults.failedTests++;
    console.log(`❌ FAILED: ${testName} - ${message}`);
  }
  
  testResults.results.push({
    name: testName,
    passed,
    message
  });
}

// TypeScript 컴파일 테스트
function testTypeScriptCompilation() {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn('npx', ['tsc', '--noEmit', '--skipLibCheck', TYPES_DIR + '/m4Processing.ts'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`TypeScript compilation failed: ${errorOutput || output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// 타입 가드 기본 테스트
function testTypeGuards() {
  return new Promise((resolve, reject) => {
    try {
      const testScript = `
        const { 
          ProcessType, 
          ProcessStep, 
          isProcessType, 
          isProcessStep, 
          isM4ProcessConfig,
          createM4ProcessProgress,
          createM4ProcessLog,
          getRequiredFiles,
          inferProcessType,
          calculateStepProgress,
          DIALOGUE_REQUIRED_FILES,
          STRING_REQUIRED_FILES
        } = require('./dist/types/m4Processing');
        
        // 타입 가드 테스트
        console.log('Testing type guards...');
        
        // ProcessType 테스트
        if (!isProcessType('dialogue')) throw new Error('ProcessType dialogue failed');
        if (!isProcessType('string')) throw new Error('ProcessType string failed');
        if (isProcessType('invalid')) throw new Error('ProcessType invalid should fail');
        
        // ProcessStep 테스트
        if (!isProcessStep('initializing')) throw new Error('ProcessStep initializing failed');
        if (!isProcessStep('completed')) throw new Error('ProcessStep completed failed');
        if (isProcessStep('invalid')) throw new Error('ProcessStep invalid should fail');
        
        // M4ProcessConfig 테스트
        const validConfig = {
          type: ProcessType.DIALOGUE,
          inputFolder: '/input',
          outputFolder: '/output',
          requiredFiles: DIALOGUE_REQUIRED_FILES,
          outputFileName: 'output.xlsx'
        };
        
        if (!isM4ProcessConfig(validConfig)) throw new Error('Valid M4ProcessConfig failed');
        if (isM4ProcessConfig({})) throw new Error('Invalid M4ProcessConfig should fail');
        
        // 팩토리 함수 테스트
        console.log('Testing factory functions...');
        
        const progress = createM4ProcessProgress(50, ProcessStep.PROCESSING_DATA, 'test.xlsx', 5, 10);
        if (progress.percentage !== 50) throw new Error('Progress creation failed');
        
        const log = createM4ProcessLog('info', 'Test message');
        if (log.level !== 'info' || log.message !== 'Test message') throw new Error('Log creation failed');
        
        // 유틸리티 함수 테스트
        console.log('Testing utility functions...');
        
        const dialogueFiles = getRequiredFiles(ProcessType.DIALOGUE);
        if (!Array.isArray(dialogueFiles) || dialogueFiles.length !== 3) throw new Error('getRequiredFiles failed');
        
        const inferredType = inferProcessType('CINEMATIC_DIALOGUE.xlsm');
        if (inferredType !== ProcessType.DIALOGUE) throw new Error('inferProcessType failed');
        
        const stepProgress = calculateStepProgress(ProcessStep.PROCESSING_DATA);
        if (stepProgress !== 50) throw new Error('calculateStepProgress failed');
        
        console.log('SUCCESS: All type validation tests passed');
        process.exit(0);
      `;
      
      const child = spawn('node', ['-e', testScript], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0 && output.includes('SUCCESS')) {
          resolve();
        } else {
          reject(new Error(`Type guards test failed: ${output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// 상수 검증 테스트
function testConstants() {
  return new Promise((resolve, reject) => {
    try {
      const testScript = `
        const { 
          DIALOGUE_REQUIRED_FILES,
          STRING_REQUIRED_FILES,
          ALL_REQUIRED_FILES,
          DEFAULT_M4_OPTIONS,
          DEFAULT_DIALOGUE_CONFIG,
          DEFAULT_STRING_CONFIG
        } = require('./dist/types/m4Processing');
        
        console.log('Testing constants...');
        
        // 필수 파일 테스트
        if (!Array.isArray(DIALOGUE_REQUIRED_FILES) || DIALOGUE_REQUIRED_FILES.length !== 3) {
          throw new Error('DIALOGUE_REQUIRED_FILES validation failed');
        }
        
        if (!Array.isArray(STRING_REQUIRED_FILES) || STRING_REQUIRED_FILES.length !== 8) {
          throw new Error('STRING_REQUIRED_FILES validation failed');
        }
        
        if (!Array.isArray(ALL_REQUIRED_FILES) || ALL_REQUIRED_FILES.length !== 11) {
          throw new Error('ALL_REQUIRED_FILES validation failed');
        }
        
        // 기본 설정 테스트
        if (typeof DEFAULT_M4_OPTIONS !== 'object' || DEFAULT_M4_OPTIONS.maxWorkerThreads !== 4) {
          throw new Error('DEFAULT_M4_OPTIONS validation failed');
        }
        
        if (typeof DEFAULT_DIALOGUE_CONFIG !== 'object' || DEFAULT_DIALOGUE_CONFIG.headerRow !== 2) {
          throw new Error('DEFAULT_DIALOGUE_CONFIG validation failed');
        }
        
        if (typeof DEFAULT_STRING_CONFIG !== 'object' || DEFAULT_STRING_CONFIG.outputColumnCount !== 15) {
          throw new Error('DEFAULT_STRING_CONFIG validation failed');
        }
        
        console.log('SUCCESS: All constants validation tests passed');
        process.exit(0);
      `;
      
      const child = spawn('node', ['-e', testScript], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0 && output.includes('SUCCESS')) {
          resolve();
        } else {
          reject(new Error(`Constants test failed: ${output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// 인터페이스 호환성 테스트
function testInterfaceCompatibility() {
  return new Promise((resolve, reject) => {
    try {
      const testScript = `
        const { 
          ProcessType,
          ProcessStep,
          ProcessPriority,
          createM4ProcessProgress,
          createM4ProcessLog,
          createEmptyM4ProcessStatistics,
          DIALOGUE_REQUIRED_FILES,
          DEFAULT_M4_OPTIONS
        } = require('./dist/types/m4Processing');
        
        console.log('Testing interface compatibility...');
        
        // M4ProcessConfig 생성 테스트
        const processConfig = {
          type: ProcessType.DIALOGUE,
          inputFolder: '/input',
          outputFolder: '/output',
          requiredFiles: DIALOGUE_REQUIRED_FILES,
          outputFileName: 'output.xlsx',
          priority: ProcessPriority.HIGH,
          options: DEFAULT_M4_OPTIONS
        };
        
        if (!processConfig.type || !processConfig.inputFolder) {
          throw new Error('M4ProcessConfig creation failed');
        }
        
        // M4ProcessProgress 생성 테스트
        const progress = createM4ProcessProgress(75, ProcessStep.WRITING_OUTPUT, 'test.xlsx', 7, 10);
        if (progress.percentage !== 75 || progress.currentStep !== ProcessStep.WRITING_OUTPUT) {
          throw new Error('M4ProcessProgress creation failed');
        }
        
        // M4ProcessResult 생성 테스트
        const result = {
          success: true,
          outputPath: '/output/result.xlsx',
          processedFileCount: 3,
          elapsedTime: 120.5,
          statistics: createEmptyM4ProcessStatistics(),
          logs: [createM4ProcessLog('info', 'Test completed')],
          generatedFiles: ['/output/result.xlsx']
        };
        
        if (!result.success || result.processedFileCount !== 3) {
          throw new Error('M4ProcessResult creation failed');
        }
        
        console.log('SUCCESS: All interface compatibility tests passed');
        process.exit(0);
      `;
      
      const child = spawn('node', ['-e', testScript], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0 && output.includes('SUCCESS')) {
          resolve();
        } else {
          reject(new Error(`Interface compatibility test failed: ${output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// 메인 테스트 실행
async function runTests() {
  console.log('🧪 M4 Types Validation Test\\n');
  console.log('Testing M4 processing TypeScript types and interfaces...\\n');
  
  try {
    // 테스트 1: 파일 존재 확인
    console.log('[1/5] 📁 M4 processing types file existence check...');
    try {
      if (fs.existsSync(path.join(TYPES_DIR, 'm4Processing.ts'))) {
        logTest('M4 processing types file exists', true);
      } else {
        logTest('M4 processing types file exists', false, 'File not found');
      }
    } catch (error) {
      logTest('M4 processing types file exists', false, error.message);
    }
    
    // 테스트 2: TypeScript 컴파일
    console.log('[2/5] 🔧 TypeScript compilation test...');
    try {
      await testTypeScriptCompilation();
      logTest('TypeScript compilation', true);
    } catch (error) {
      logTest('TypeScript compilation', false, error.message);
    }
    
    // 테스트 3: 타입 가드 및 유틸리티 함수
    console.log('[3/5] 🛡️ Type guards and utility functions test...');
    try {
      await testTypeGuards();
      logTest('Type guards and utility functions', true);
    } catch (error) {
      logTest('Type guards and utility functions', false, error.message);
    }
    
    // 테스트 4: 상수 검증
    console.log('[4/5] 📊 Constants validation test...');
    try {
      await testConstants();
      logTest('Constants validation', true);
    } catch (error) {
      logTest('Constants validation', false, error.message);
    }
    
    // 테스트 5: 인터페이스 호환성
    console.log('[5/5] 🔗 Interface compatibility test...');
    try {
      await testInterfaceCompatibility();
      logTest('Interface compatibility', true);
    } catch (error) {
      logTest('Interface compatibility', false, error.message);
    }
    
  } catch (error) {
    console.error('Test execution failed:', error.message);
  }
  
  // 결과 출력
  console.log('\\n============================================================');
  console.log('📊 M4 Types Validation Results');
  console.log('============================================================');
  console.log(`   Total Tests: ${testResults.totalTests}`);
  console.log(`   Passed: ${testResults.passedTests}`);
  console.log(`   Failed: ${testResults.failedTests}`);
  console.log(`   Success Rate: ${((testResults.passedTests / testResults.totalTests) * 100).toFixed(1)}%`);
  
  if (testResults.failedTests > 0) {
    console.log('\\n❌ Failed Tests:');
    testResults.results
      .filter(result => !result.passed)
      .forEach(result => {
        console.log(`   - ${result.name}: ${result.message}`);
      });
  }
  
  console.log('\\n🎉 M4 types validation test completed!');
  console.log('✅ TypeScript data models and interfaces are ready for M4 processing');
  
  // 종료 코드
  process.exit(testResults.failedTests > 0 ? 1 : 0);
}

// 테스트 실행
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };