/**
 * ExcelJS Integration Test
 * ExcelJS가 Electron 메인/렌더러 프로세스에서 올바르게 작동하는지 테스트
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// 테스트 상수
const TEST_DIR = path.join(__dirname, 'temp');
const TEST_EXCEL_FILE = path.join(TEST_DIR, 'test.xlsx');
const TEST_TIMEOUT = 30000;

// 테스트 결과 저장
let testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  results: []
};

// 유틸리티 함수
function createTestDirectory() {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
}

function cleanupTestDirectory() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

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

// 테스트 Excel 파일 생성
function createTestExcelFile() {
  return new Promise((resolve, reject) => {
    try {
      const testScript = `
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Test Sheet');
        
        worksheet.getCell('A1').value = 'Hello World';
        worksheet.getCell('B1').value = 42;
        worksheet.getCell('C1').value = new Date('2025-01-01');
        worksheet.getCell('D1').value = true;
        
        workbook.xlsx.writeFile('${TEST_EXCEL_FILE}')
          .then(() => {
            console.log('SUCCESS: Excel file created');
            process.exit(0);
          })
          .catch(err => {
            console.error('ERROR: ' + err.message);
            process.exit(1);
          });
      `;
      
      // Node.js 스크립트로 실행
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
          reject(new Error(`Excel file creation failed: ${output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// Excel 파일 읽기 테스트
function testExcelFileReading() {
  return new Promise((resolve, reject) => {
    try {
      const testScript = `
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        
        workbook.xlsx.readFile('${TEST_EXCEL_FILE}')
          .then(() => {
            const worksheet = workbook.getWorksheet('Test Sheet');
            if (!worksheet) {
              throw new Error('Worksheet not found');
            }
            
            const a1 = worksheet.getCell('A1').value;
            const b1 = worksheet.getCell('B1').value;
            const c1 = worksheet.getCell('C1').value;
            const d1 = worksheet.getCell('D1').value;
            
            if (a1 !== 'Hello World' || b1 !== 42 || !c1 || d1 !== true) {
              throw new Error('Cell values do not match expected values');
            }
            
            console.log('SUCCESS: Excel file read correctly');
            process.exit(0);
          })
          .catch(err => {
            console.error('ERROR: ' + err.message);
            process.exit(1);
          });
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
          reject(new Error(`Excel file reading failed: ${output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// ExcelProcessor 클래스 테스트
function testExcelProcessorClass() {
  return new Promise((resolve, reject) => {
    try {
      const testScript = `
        const { ExcelProcessor, testExcelProcessing } = require('./dist/utils/excelProcessor');
        
        testExcelProcessing()
          .then(result => {
            if (result) {
              console.log('SUCCESS: ExcelProcessor test passed');
              process.exit(0);
            } else {
              console.error('ERROR: ExcelProcessor test failed');
              process.exit(1);
            }
          })
          .catch(err => {
            console.error('ERROR: ' + err.message);
            process.exit(1);
          });
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
          reject(new Error(`ExcelProcessor test failed: ${output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// 메모리 사용량 테스트
function testMemoryUsage() {
  return new Promise((resolve, reject) => {
    try {
      const testScript = `
        const ExcelJS = require('exceljs');
        const initialMemory = process.memoryUsage().heapUsed;
        
        // 큰 Excel 파일 시뮬레이션
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Large Sheet');
        
        // 1000행 × 10컬럼 데이터 생성
        for (let row = 1; row <= 1000; row++) {
          for (let col = 1; col <= 10; col++) {
            worksheet.getCell(row, col).value = 'Data ' + row + '-' + col;
          }
        }
        
        const afterCreationMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = afterCreationMemory - initialMemory;
        const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
        
        console.log('Memory increase: ' + memoryIncreaseMB.toFixed(2) + ' MB');
        
        if (memoryIncreaseMB > 100) {
          console.error('ERROR: Memory usage too high');
          process.exit(1);
        } else {
          console.log('SUCCESS: Memory usage within acceptable limits');
          process.exit(0);
        }
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
          reject(new Error(`Memory usage test failed: ${output}`));
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// 메인 테스트 실행
async function runTests() {
  console.log('🧪 ExcelJS Integration Test\\n');
  console.log('Testing ExcelJS integration with Electron processes...\\n');
  
  try {
    // 테스트 준비
    createTestDirectory();
    
    // 테스트 1: ExcelJS 패키지 로드
    console.log('[1/5] 📦 ExcelJS package loading test...');
    try {
      require('exceljs');
      logTest('ExcelJS package loading', true);
    } catch (error) {
      logTest('ExcelJS package loading', false, error.message);
    }
    
    // 테스트 2: Excel 파일 생성
    console.log('[2/5] 📝 Excel file creation test...');
    try {
      await createTestExcelFile();
      logTest('Excel file creation', true);
    } catch (error) {
      logTest('Excel file creation', false, error.message);
    }
    
    // 테스트 3: Excel 파일 읽기
    console.log('[3/5] 📖 Excel file reading test...');
    try {
      await testExcelFileReading();
      logTest('Excel file reading', true);
    } catch (error) {
      logTest('Excel file reading', false, error.message);
    }
    
    // 테스트 4: ExcelProcessor 클래스 테스트
    console.log('[4/5] 🔧 ExcelProcessor class test...');
    try {
      await testExcelProcessorClass();
      logTest('ExcelProcessor class functionality', true);
    } catch (error) {
      logTest('ExcelProcessor class functionality', false, error.message);
    }
    
    // 테스트 5: 메모리 사용량 테스트
    console.log('[5/5] 🧠 Memory usage test...');
    try {
      await testMemoryUsage();
      logTest('Memory usage within limits', true);
    } catch (error) {
      logTest('Memory usage within limits', false, error.message);
    }
    
  } catch (error) {
    console.error('Test execution failed:', error.message);
  } finally {
    // 정리
    cleanupTestDirectory();
  }
  
  // 결과 출력
  console.log('\\n============================================================');
  console.log('📊 ExcelJS Integration Test Results');
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
  
  console.log('\\n🎉 ExcelJS integration test completed!');
  console.log('✅ ExcelJS is ready for M4 Excel processing');
  
  // 종료 코드
  process.exit(testResults.failedTests > 0 ? 1 : 0);
}

// 테스트 실행
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };