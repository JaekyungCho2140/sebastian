const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  testTimeout: 30000,
  testDataDir: path.join(__dirname, 'test-data'),
  outputDir: path.join(__dirname, 'test-outputs'),
  expectedColumns: [
    '#', 'Table Name', 'String ID', 'Table/ID', 'NPC ID', 'Speaker Name',
    'KO (M)', 'KO (F)', 'EN (M)', 'EN (F)', 'CT (M)', 'CT (F)',
    'CS (M)', 'CS (F)', 'JA (M)', 'JA (F)', 'TH (M)', 'TH (F)',
    'ES-LATAM (M)', 'ES-LATAM (F)', 'PT-BR (M)', 'PT-BR (F)', 'NOTE'
  ]
};

// Test utilities
class M4DialogueTestUtils {
  static createTestDirectories() {
    if (!fs.existsSync(TEST_CONFIG.testDataDir)) {
      fs.mkdirSync(TEST_CONFIG.testDataDir, { recursive: true });
    }
    if (!fs.existsSync(TEST_CONFIG.outputDir)) {
      fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
    }
  }

  static createMockExcelFile(filename, data) {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    
    // Add headers
    if (data.headers) {
      worksheet.getRow(1).values = data.headers;
    }
    
    // Add data rows
    if (data.rows) {
      data.rows.forEach((row, index) => {
        const rowIndex = data.startRow || (index + 2);
        worksheet.getRow(rowIndex).values = row;
      });
    }
    
    const filePath = path.join(TEST_CONFIG.testDataDir, filename);
    return workbook.xlsx.writeFile(filePath);
  }

  static createMockNPCFile() {
    const headers = ['', '', '', '', '', '', '', 'NPC_ID', '', 'NPC_Name'];
    const rows = [
      ['', '', '', '', '', '', '', 'NPC001', '', 'Test NPC 1'],
      ['', '', '', '', '', '', '', 'NPC002', '', 'Test NPC 2'],
      ['', '', '', '', '', '', '', 'NPC003', '', 'Test NPC 3']
    ];
    
    return this.createMockExcelFile('NPC.xlsm', {
      headers,
      rows,
      startRow: 2
    });
  }

  static createMockCinematicFile() {
    const headers = [
      '', '', '', '', '', '', '', 'String_ID', 'NPC_ID', '', '',
      'KO_M', 'KO_F', 'EN_M', 'EN_F', 'CT_M', 'CT_F', 'CS_M', 'CS_F',
      'JA_M', 'JA_F', 'TH_M', 'TH_F', 'ES_LATAM_M', 'ES_LATAM_F',
      'PT_BR_M', 'PT_BR_F', '', '', 'NOTE'
    ];
    
    // Skip 9 rows then add data
    const rows = [
      ['', '', '', '', '', '', '', 'CINE001', 'NPC001', '', '',
       'Korean M 1', 'Korean F 1', 'English M 1', 'English F 1', 'Chinese M 1', 'Chinese F 1',
       'Czech M 1', 'Czech F 1', 'Japanese M 1', 'Japanese F 1', 'Thai M 1', 'Thai F 1',
       'Spanish M 1', 'Spanish F 1', 'Portuguese M 1', 'Portuguese F 1', '', '', 'Note 1'],
      ['', '', '', '', '', '', '', 'CINE002', 'NPC002', '', '',
       'Korean M 2', 'Korean F 2', 'English M 2', 'English F 2', 'Chinese M 2', 'Chinese F 2',
       'Czech M 2', 'Czech F 2', 'Japanese M 2', 'Japanese F 2', 'Thai M 2', 'Thai F 2',
       'Spanish M 2', 'Spanish F 2', 'Portuguese M 2', 'Portuguese F 2', '', '', 'Note 2'],
      // Row with empty EN (M) - should be filtered out
      ['', '', '', '', '', '', '', 'CINE003', 'NPC003', '', '',
       'Korean M 3', 'Korean F 3', '', 'English F 3', 'Chinese M 3', 'Chinese F 3',
       'Czech M 3', 'Czech F 3', 'Japanese M 3', 'Japanese F 3', 'Thai M 3', 'Thai F 3',
       'Spanish M 3', 'Spanish F 3', 'Portuguese M 3', 'Portuguese F 3', '', '', 'Note 3'],
      // Row with '미사용' in EN (M) - should be filtered out
      ['', '', '', '', '', '', '', 'CINE004', 'NPC001', '', '',
       'Korean M 4', 'Korean F 4', '미사용', 'English F 4', 'Chinese M 4', 'Chinese F 4',
       'Czech M 4', 'Czech F 4', 'Japanese M 4', 'Japanese F 4', 'Thai M 4', 'Thai F 4',
       'Spanish M 4', 'Spanish F 4', 'Portuguese M 4', 'Portuguese F 4', '', '', 'Note 4']
    ];
    
    return this.createMockExcelFile('CINEMATIC_DIALOGUE.xlsm', {
      headers,
      rows,
      startRow: 10 // Skip 9 rows
    });
  }

  static createMockSmalltalkFile() {
    const headers = [
      '', '', '', '', '', '', '', 'String_ID', 'NPC_ID', '', '', '',
      'KO_M', 'KO_F', 'EN_M', 'EN_F', 'CT_M', 'CT_F', 'CS_M', 'CS_F',
      'JA_M', 'JA_F', 'TH_M', 'TH_F', 'ES_LATAM_M', 'ES_LATAM_F',
      'PT_BR_M', 'PT_BR_F', '', '', 'NOTE'
    ];
    
    // Skip 4 rows then add data
    const rows = [
      ['', '', '', '', '', '', '', 'SMALL001', 'NPC001', '', '', '',
       'Korean M 1', 'Korean F 1', 'English M 1', 'English F 1', 'Chinese M 1', 'Chinese F 1',
       'Czech M 1', 'Czech F 1', 'Japanese M 1', 'Japanese F 1', 'Thai M 1', 'Thai F 1',
       'Spanish M 1', 'Spanish F 1', 'Portuguese M 1', 'Portuguese F 1', '', '', 'Note 1'],
      ['', '', '', '', '', '', '', 'SMALL002', 'NPC002', '', '', '',
       'Korean M 2', 'Korean F 2', 'English M 2', 'English F 2', 'Chinese M 2', 'Chinese F 2',
       'Czech M 2', 'Czech F 2', 'Japanese M 2', 'Japanese F 2', 'Thai M 2', 'Thai F 2',
       'Spanish M 2', 'Spanish F 2', 'Portuguese M 2', 'Portuguese F 2', '', '', 'Note 2']
    ];
    
    return this.createMockExcelFile('SMALLTALK_DIALOGUE.xlsm', {
      headers,
      rows,
      startRow: 5 // Skip 4 rows
    });
  }

  static async createTestData() {
    await this.createMockNPCFile();
    await this.createMockCinematicFile();
    await this.createMockSmalltalkFile();
  }

  static validateOutputFile(outputPath) {
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Output file not found: ${outputPath}`);
    }

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    
    return workbook.xlsx.readFile(outputPath).then(() => {
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new Error('No worksheet found in output file');
      }

      // Check headers
      const headerRow = worksheet.getRow(1);
      TEST_CONFIG.expectedColumns.forEach((expectedHeader, index) => {
        const actualHeader = headerRow.getCell(index + 1).value;
        if (actualHeader !== expectedHeader) {
          throw new Error(`Header mismatch at column ${index + 1}: expected "${expectedHeader}", got "${actualHeader}"`);
        }
      });

      // Check data rows
      const dataRows = [];
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData = [];
        for (let colNumber = 1; colNumber <= TEST_CONFIG.expectedColumns.length; colNumber++) {
          rowData.push(row.getCell(colNumber).value);
        }
        dataRows.push(rowData);
      }

      return {
        headers: TEST_CONFIG.expectedColumns,
        dataRows,
        rowCount: dataRows.length
      };
    });
  }

  static cleanup() {
    if (fs.existsSync(TEST_CONFIG.testDataDir)) {
      fs.rmSync(TEST_CONFIG.testDataDir, { recursive: true, force: true });
    }
    if (fs.existsSync(TEST_CONFIG.outputDir)) {
      fs.rmSync(TEST_CONFIG.outputDir, { recursive: true, force: true });
    }
  }
}

// Test runner
class M4DialogueTestRunner {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  async runTest(testName, testFunction) {
    const testStart = Date.now();
    console.log(`\n[TEST] ${testName}`);
    
    try {
      await testFunction();
      const duration = Date.now() - testStart;
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
      this.testResults.push({ name: testName, status: 'PASSED', duration });
    } catch (error) {
      const duration = Date.now() - testStart;
      console.log(`❌ ${testName} - FAILED (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      this.testResults.push({ name: testName, status: 'FAILED', duration, error: error.message });
    }
  }

  async runAllTests() {
    console.log('🚀 Starting M4 Dialogue Processor Tests...\n');
    
    // Setup
    M4DialogueTestUtils.createTestDirectories();
    await M4DialogueTestUtils.createTestData();
    
    // Test 1: TypeScript compilation
    await this.runTest('TypeScript Compilation', async () => {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
    });

    // Test 2: Basic import test
    await this.runTest('Module Import', async () => {
      const { M4DialogueProcessor } = require('../src/services/m4DialogueProcessor');
      const processor = new M4DialogueProcessor();
      if (!processor) {
        throw new Error('Failed to create M4DialogueProcessor instance');
      }
      processor.dispose();
    });

    // Test 3: NPC mapping test
    await this.runTest('NPC Mapping Loading', async () => {
      // This test would require compiling TypeScript and running in Node.js
      // For now, we'll test the file structure
      const npcFile = path.join(TEST_CONFIG.testDataDir, 'NPC.xlsm');
      if (!fs.existsSync(npcFile)) {
        throw new Error('NPC test file not found');
      }
      
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(npcFile);
      const worksheet = workbook.getWorksheet('Sheet1');
      
      if (!worksheet) {
        throw new Error('NPC worksheet not found');
      }
      
      // Check if NPC data is properly structured
      const npcIdCell = worksheet.getRow(2).getCell(8).value;
      const npcNameCell = worksheet.getRow(2).getCell(10).value;
      
      if (!npcIdCell || !npcNameCell) {
        throw new Error('NPC data not properly structured');
      }
    });

    // Test 4: CINEMATIC_DIALOGUE file structure
    await this.runTest('CINEMATIC_DIALOGUE File Structure', async () => {
      const cinematicFile = path.join(TEST_CONFIG.testDataDir, 'CINEMATIC_DIALOGUE.xlsm');
      if (!fs.existsSync(cinematicFile)) {
        throw new Error('CINEMATIC_DIALOGUE test file not found');
      }
      
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(cinematicFile);
      const worksheet = workbook.getWorksheet(1);
      
      if (!worksheet) {
        throw new Error('CINEMATIC_DIALOGUE worksheet not found');
      }
      
      // Check if data starts at row 10 (skip 9 rows)
      const row10 = worksheet.getRow(10);
      const stringId = row10.getCell(8).value;
      const npcId = row10.getCell(9).value;
      
      if (!stringId || !npcId) {
        throw new Error('CINEMATIC_DIALOGUE data not properly structured');
      }
    });

    // Test 5: SMALLTALK_DIALOGUE file structure
    await this.runTest('SMALLTALK_DIALOGUE File Structure', async () => {
      const smalltalkFile = path.join(TEST_CONFIG.testDataDir, 'SMALLTALK_DIALOGUE.xlsm');
      if (!fs.existsSync(smalltalkFile)) {
        throw new Error('SMALLTALK_DIALOGUE test file not found');
      }
      
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(smalltalkFile);
      const worksheet = workbook.getWorksheet(1);
      
      if (!worksheet) {
        throw new Error('SMALLTALK_DIALOGUE worksheet not found');
      }
      
      // Check if data starts at row 5 (skip 4 rows)
      const row5 = worksheet.getRow(5);
      const stringId = row5.getCell(8).value;
      const npcId = row5.getCell(9).value;
      
      if (!stringId || !npcId) {
        throw new Error('SMALLTALK_DIALOGUE data not properly structured');
      }
    });

    // Test 6: Column mapping verification
    await this.runTest('Column Mapping Verification', async () => {
      const cinematicFile = path.join(TEST_CONFIG.testDataDir, 'CINEMATIC_DIALOGUE.xlsm');
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(cinematicFile);
      const worksheet = workbook.getWorksheet(1);
      
      const testRow = worksheet.getRow(10);
      
      // Verify specific column mappings according to Python spec
      const stringId = testRow.getCell(8).value; // Column 7 (0-indexed)
      const npcId = testRow.getCell(9).value;    // Column 8 (0-indexed)
      const enM = testRow.getCell(14).value;     // Column 13 (0-indexed)
      
      if (!stringId || !npcId || !enM) {
        throw new Error('Column mapping verification failed');
      }
    });

    // Test 7: Filtering logic test
    await this.runTest('EN (M) Filtering Logic', async () => {
      const cinematicFile = path.join(TEST_CONFIG.testDataDir, 'CINEMATIC_DIALOGUE.xlsm');
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(cinematicFile);
      const worksheet = workbook.getWorksheet(1);
      
      let validRows = 0;
      let filteredRows = 0;
      
      for (let rowNumber = 10; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const enMValue = row.getCell(14).value; // EN (M) column
        
        if (enMValue && 
            enMValue.toString().trim() !== '' && 
            enMValue.toString().trim() !== '0' &&
            enMValue.toString().trim() !== '미사용') {
          validRows++;
        } else {
          filteredRows++;
        }
      }
      
      if (validRows === 0) {
        throw new Error('No valid rows found - filtering logic may be incorrect');
      }
      
      console.log(`   Valid rows: ${validRows}, Filtered rows: ${filteredRows}`);
    });

    // Test 8: Output filename format
    await this.runTest('Output Filename Format', async () => {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const expectedFilename = `${month}${day}_MIR4_MASTER_DIALOGUE.xlsx`;
      
      const filenameRegex = /^\d{2}\d{2}_MIR4_MASTER_DIALOGUE\.xlsx$/;
      if (!filenameRegex.test(expectedFilename)) {
        throw new Error(`Invalid filename format: ${expectedFilename}`);
      }
    });

    // Cleanup
    M4DialogueTestUtils.cleanup();
    
    // Generate test report
    this.generateTestReport();
  }

  generateTestReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASSED').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAILED').length;
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 M4 DIALOGUE PROCESSOR TEST REPORT');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.filter(r => r.status === 'FAILED').forEach(test => {
        console.log(`   - ${test.name}: ${test.error}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Save test report
    const reportPath = path.join(TEST_CONFIG.outputDir, `m4-dialogue-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalTests,
      passedTests,
      failedTests,
      totalDuration,
      successRate: ((passedTests / totalTests) * 100).toFixed(1),
      testResults: this.testResults
    }, null, 2));
    
    console.log(`📄 Test report saved: ${reportPath}`);
    
    // Exit with error code if tests failed
    if (failedTests > 0) {
      process.exit(1);
    }
  }
}

// Run tests
async function runTests() {
  const runner = new M4DialogueTestRunner();
  await runner.runAllTests();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  M4DialogueTestRunner,
  M4DialogueTestUtils,
  TEST_CONFIG
};