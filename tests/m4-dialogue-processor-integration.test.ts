import { M4DialogueProcessor } from '../src/services/m4DialogueProcessor';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

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
  static createTestDirectories(): void {
    if (!fs.existsSync(TEST_CONFIG.testDataDir)) {
      fs.mkdirSync(TEST_CONFIG.testDataDir, { recursive: true });
    }
    if (!fs.existsSync(TEST_CONFIG.outputDir)) {
      fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
    }
  }

  static async createMockExcelFile(filename: string, data: any): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    
    // Add headers
    if (data.headers) {
      worksheet.getRow(1).values = data.headers;
    }
    
    // Add data rows
    if (data.rows) {
      data.rows.forEach((row: any[], index: number) => {
        const rowIndex = data.startRow || (index + 2);
        worksheet.getRow(rowIndex).values = row;
      });
    }
    
    const filePath = path.join(TEST_CONFIG.testDataDir, filename);
    await workbook.xlsx.writeFile(filePath);
  }

  static async createMockNPCFile(): Promise<void> {
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

  static async createMockCinematicFile(): Promise<void> {
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
       'Spanish M 2', 'Spanish F 2', 'Portuguese M 2', 'Portuguese F 2', '', '', 'Note 2']
    ];
    
    return this.createMockExcelFile('CINEMATIC_DIALOGUE.xlsm', {
      headers,
      rows,
      startRow: 10 // Skip 9 rows
    });
  }

  static async createMockSmalltalkFile(): Promise<void> {
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

  static async createTestData(): Promise<void> {
    await this.createMockNPCFile();
    await this.createMockCinematicFile();
    await this.createMockSmalltalkFile();
  }

  static cleanup(): void {
    if (fs.existsSync(TEST_CONFIG.testDataDir)) {
      fs.rmSync(TEST_CONFIG.testDataDir, { recursive: true, force: true });
    }
    if (fs.existsSync(TEST_CONFIG.outputDir)) {
      fs.rmSync(TEST_CONFIG.outputDir, { recursive: true, force: true });
    }
  }
}

// Test runner
class M4DialogueIntegrationTestRunner {
  private testResults: Array<{
    name: string;
    status: 'PASSED' | 'FAILED';
    duration: number;
    error?: string;
  }> = [];
  private startTime: number = Date.now();

  async runTest(testName: string, testFunction: () => Promise<void>): Promise<void> {
    const testStart = Date.now();
    console.log(`\n[TEST] ${testName}`);
    
    try {
      await testFunction();
      const duration = Date.now() - testStart;
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
      this.testResults.push({ name: testName, status: 'PASSED', duration });
    } catch (error) {
      const duration = Date.now() - testStart;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${testName} - FAILED (${duration}ms)`);
      console.log(`   Error: ${errorMessage}`);
      this.testResults.push({ name: testName, status: 'FAILED', duration, error: errorMessage });
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting M4 Dialogue Processor Integration Tests...\n');
    
    // Setup
    M4DialogueTestUtils.createTestDirectories();
    await M4DialogueTestUtils.createTestData();
    
    // Test 1: Basic processor instantiation
    await this.runTest('Processor Instantiation', async () => {
      const processor = new M4DialogueProcessor();
      if (!processor) {
        throw new Error('Failed to create M4DialogueProcessor instance');
      }
      processor.dispose();
    });

    // Test 2: Test data validation
    await this.runTest('Test Data Validation', async () => {
      const npcFile = path.join(TEST_CONFIG.testDataDir, 'NPC.xlsm');
      const cinematicFile = path.join(TEST_CONFIG.testDataDir, 'CINEMATIC_DIALOGUE.xlsm');
      const smalltalkFile = path.join(TEST_CONFIG.testDataDir, 'SMALLTALK_DIALOGUE.xlsm');
      
      if (!fs.existsSync(npcFile)) {
        throw new Error('NPC test file not found');
      }
      if (!fs.existsSync(cinematicFile)) {
        throw new Error('CINEMATIC_DIALOGUE test file not found');
      }
      if (!fs.existsSync(smalltalkFile)) {
        throw new Error('SMALLTALK_DIALOGUE test file not found');
      }
    });

    // Test 3: File structure verification
    await this.runTest('File Structure Verification', async () => {
      const cinematicFile = path.join(TEST_CONFIG.testDataDir, 'CINEMATIC_DIALOGUE.xlsm');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(cinematicFile);
      const worksheet = workbook.getWorksheet(1);
      
      if (!worksheet) {
        throw new Error('CINEMATIC_DIALOGUE worksheet not found');
      }
      
      // Check if data exists at row 10 (after skipping 9 rows)
      const row10 = worksheet.getRow(10);
      const stringId = row10.getCell(8).value;
      const npcId = row10.getCell(9).value;
      const enM = row10.getCell(14).value;
      
      if (!stringId || !npcId || !enM) {
        throw new Error('Data structure validation failed');
      }
    });

    // Test 4: Processing workflow (mock test)
    await this.runTest('Processing Workflow Structure', async () => {
      const processor = new M4DialogueProcessor((message, level) => {
        console.log(`   [${level}] ${message}`);
      });
      
      // Test the processor structure without actual processing
      if (typeof processor.processM4Dialogue !== 'function') {
        throw new Error('processM4Dialogue method not found');
      }
      
      processor.dispose();
    });

    // Cleanup
    M4DialogueTestUtils.cleanup();
    
    // Generate test report
    this.generateTestReport();
  }

  generateTestReport(): void {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASSED').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAILED').length;
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 M4 DIALOGUE PROCESSOR INTEGRATION TEST REPORT');
    console.log('='.repeat(60));
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
    
    console.log('\n' + '='.repeat(60));
    
    // Save test report
    const reportPath = path.join(TEST_CONFIG.outputDir, `m4-dialogue-integration-test-report-${Date.now()}.json`);
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
async function runTests(): Promise<void> {
  const runner = new M4DialogueIntegrationTestRunner();
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

export {
  M4DialogueIntegrationTestRunner,
  M4DialogueTestUtils,
  TEST_CONFIG
};